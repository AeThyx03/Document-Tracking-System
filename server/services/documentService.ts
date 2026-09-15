import { eq, and, or, ilike, sql, desc, asc } from 'drizzle-orm';
import { db, withTransaction } from '../db/index.ts';
import {
  documents,
  documentMovements,
  documentRemarks,
  managerClearances,
  auditLogs,
  users,
  personnel,
  desks,
  departments,
} from '../db/schema.ts';
import { createAuditLog, AuditActor } from './auditService.ts';

export class DocumentConflictError extends Error {
  constructor(message = 'Document has been modified by another process. Please refresh and retry.') {
    super(message);
    this.name = 'DocumentConflictError';
  }
}

export class DocumentNotFoundError extends Error {
  constructor(id: string) {
    super(`Document with ID "${id}" not found.`);
    this.name = 'DocumentNotFoundError';
  }
}

export class DocumentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DocumentValidationError';
  }
}

/**
 * Resolves canonical personnel name and ID bidirectionally.
 * Prioritizes ID if present; otherwise queries by name.
 */
export async function resolvePersonnelInfo(id?: number | null, name?: string | null): Promise<{ id: number | null; name: string }> {
  if (id) {
    const [p] = await db.select().from(personnel).where(eq(personnel.id, Number(id)));
    if (p) return { id: p.id, name: p.name };
  }
  if (name && name.trim() && name !== 'Unassigned' && name !== 'Records Officer') {
    const [p] = await db.select().from(personnel).where(ilike(personnel.name, name.trim()));
    if (p) return { id: p.id, name: p.name };
  }
  return { id: id ? Number(id) : null, name: name || 'Unassigned' };
}

/**
 * Resolves canonical desk name and ID bidirectionally.
 */
export async function resolveDeskInfo(id?: number | null, name?: string | null): Promise<{ id: number | null; name: string }> {
  if (id) {
    const [d] = await db.select().from(desks).where(eq(desks.id, Number(id)));
    if (d) return { id: d.id, name: d.name };
  }
  if (name && name.trim() && name !== 'Receiving Desk') {
    const [d] = await db.select().from(desks).where(ilike(desks.name, name.trim()));
    if (d) return { id: d.id, name: d.name };
  }
  return { id: id ? Number(id) : null, name: name || 'Receiving Desk' };
}

/**
 * Resolves authentic user & personnel identity strictly from PostgreSQL records.
 * Never trusts request body values for authoritative actor identity.
 */
export async function getAuthoritativeUserById(userId: string | number | undefined | null) {
  if (!userId) return null;
  const numId = Number(userId);
  if (!numId || isNaN(numId)) return null;

  try {
    const [u] = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, numId));

    if (!u) return null;

    const [p] = await db
      .select({
        id: personnel.id,
        name: personnel.name,
        role: personnel.role,
        division: personnel.division,
      })
      .from(personnel)
      .where(eq(personnel.userId, numId));

    return {
      userId: u.id,
      personnelId: p?.id || null,
      name: p?.name || u.username || u.email,
      role: p?.role || u.role,
      division: p?.division || 'General',
      email: u.email,
      isActive: u.isActive,
    };
  } catch (err) {
    console.error('[DocumentService] Error resolving authoritative user:', err);
    return null;
  }
}

/**
 * Single source of truth clearance formatting.
 * Strictly derives clearance state from manager_clearances record.
 * Ensures legacy documents fields and managerClearance object are 100% synchronized and never contradictory.
 */
export function formatDocumentWithClearance(d: any, mc?: any) {
  const isActuallyCleared = mc ? Boolean(mc.isCleared) : false;
  const managerClearance = {
    isCleared: isActuallyCleared,
    clearedBy: isActuallyCleared ? (mc?.clearedBy || null) : null,
    clearedAt: isActuallyCleared ? (mc?.clearedAt ? new Date(mc.clearedAt).toISOString() : null) : null,
    clearanceType: isActuallyCleared ? (mc?.clearanceType || null) : (mc?.clearanceType === 'returned_for_revision' ? 'returned_for_revision' : null),
    exitTrackingNumber: isActuallyCleared ? (mc?.exitTrackingNumber || null) : null,
    forwardedToExternal: isActuallyCleared ? (mc?.forwardedToExternal || null) : null,
    clearanceRemarks: mc?.clearanceRemarks || null,
  };

  return {
    ...d,
    isCleared: isActuallyCleared,
    clearedBy: isActuallyCleared ? (mc?.clearedBy || null) : null,
    clearedAt: isActuallyCleared ? (mc?.clearedAt ? new Date(mc.clearedAt).toISOString() : null) : null,
    clearanceType: managerClearance.clearanceType,
    exitTrackingNumber: managerClearance.exitTrackingNumber,
    forwardedToExternal: managerClearance.forwardedToExternal,
    clearanceRemarks: managerClearance.clearanceRemarks,
    managerClearance,
  };
}

export interface DocumentFilterOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  division?: string;
  priority?: string;
  viewMode?: string;
  sort?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface PaginatedDocumentsResult {
  documents: any[];
  totalCount: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

export async function getAllDocuments(options?: DocumentFilterOptions): Promise<any> {
  const conditions = [];

  if (options?.status && options.status !== 'All' && options.status !== 'ALL') {
    conditions.push(eq(documents.currentStatus, options.status));
  }

  if (options?.division && options.division !== 'All' && options.division !== 'ALL') {
    conditions.push(eq(documents.targetDivision, options.division));
  }

  if (options?.priority && options.priority !== 'All' && options.priority !== 'ALL') {
    conditions.push(eq(documents.priority, options.priority));
  }

  if (options?.viewMode) {
    if (options.viewMode === 'incoming') {
      conditions.push(sql`${documents.currentStatus} IN ('Incoming Logged', 'Under Review')`);
    } else if (options.viewMode === 'outgoing') {
      conditions.push(sql`${documents.currentStatus} IN ('Cleared for Out', 'Dispatched / Completed')`);
    } else if (options.viewMode === 'compliance_needed') {
      conditions.push(
        sql`(${documents.currentStatus} = 'Supervisor Comment Needed' OR EXISTS (
          SELECT 1 FROM document_remarks dr WHERE dr.document_id = ${documents.id} AND dr.compliance_required = true AND dr.complied = false
        ))`
      );
    } else if (options.viewMode === 'overdue') {
      conditions.push(eq(documents.isCleared, false));
    }
  }

  if (options?.search && options.search.trim()) {
    const q = `%${options.search.trim()}%`;
    conditions.push(
      or(
        ilike(documents.trackingNumber, q),
        ilike(documents.title, q),
        ilike(documents.originDepartment, q),
        ilike(documents.responsiblePerson, q),
        ilike(documents.currentLocation, q),
        ilike(documents.currentCustodian, q),
        ilike(documents.targetDivision, q)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Authoritative sorting logic
  const sortCol = options?.sort || 'updatedAt';
  const isAsc = options?.sortDirection === 'asc';
  const sortFn = isAsc ? asc : desc;

  let orderColumn: any = documents.updatedAt;
  if (sortCol === 'createdAt') orderColumn = documents.createdAt;
  else if (sortCol === 'dateReceived') orderColumn = documents.dateReceived;
  else if (sortCol === 'trackingNumber') orderColumn = documents.trackingNumber;
  else if (sortCol === 'title') orderColumn = documents.title;
  else if (sortCol === 'priority') orderColumn = documents.priority;
  else if (sortCol === 'targetDivision') orderColumn = documents.targetDivision;
  else if (sortCol === 'currentCustodian') orderColumn = documents.currentCustodian;
  else if (sortCol === 'currentLocation') orderColumn = documents.currentLocation;
  else if (sortCol === 'currentStatus' || sortCol === 'status' || sortCol === 'lifecycle') orderColumn = documents.currentStatus;

  // Count total matches
  const [countRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documents)
    .where(whereClause);
  const totalCount = countRes?.count || 0;

  const page = options?.page ? Math.max(1, Number(options.page)) : undefined;
  const pageSize = options?.pageSize ? Math.max(1, Number(options.pageSize)) : undefined;

  const queryBuilder: any = {
    where: whereClause,
    with: {
      movements: {
        orderBy: (m: any, { asc }: any) => [asc(m.timestamp), asc(m.createdAt), asc(m.id)],
      },
      remarks: {
        orderBy: (r: any, { desc }: any) => [desc(r.timestamp)],
      },
      clearance: true,
    },
    orderBy: [sortFn(orderColumn), desc(documents.updatedAt), asc(documents.id)],
  };

  if (page && pageSize) {
    queryBuilder.limit = pageSize;
    queryBuilder.offset = (page - 1) * pageSize;
  }

  const rawDocs = await db.query.documents.findMany(queryBuilder);

  const mapped = rawDocs.map((d) => {
    // Deterministic chronological movement ordering
    const sortedMovements = (d.movements || []).sort((a: any, b: any) => {
      const timeDiff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      if (timeDiff !== 0) return timeDiff;
      return String(a.id).localeCompare(String(b.id));
    });

    const latestMovement = sortedMovements.length > 0 ? sortedMovements[sortedMovements.length - 1] : null;

    return {
      ...formatDocumentWithClearance(d, d.clearance),
      movements: sortedMovements,
      latestMovement,
      supervisorRemarks: d.remarks,
    };
  });

  if (page !== undefined && pageSize !== undefined) {
    const totalPages = Math.ceil(totalCount / pageSize);
    return {
      documents: mapped,
      totalCount,
      page,
      pageSize,
      totalPages,
    };
  }

  return mapped;
}

export async function getDocumentById(id: string) {
  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, id),
    with: {
      movements: true,
      remarks: true,
      clearance: true,
    },
  });

  if (!doc) {
    throw new DocumentNotFoundError(id);
  }

  return {
    ...formatDocumentWithClearance(doc, doc.clearance),
    supervisorRemarks: doc.remarks,
  };
}

export async function createNewDocument(data: any, userId?: string, actor?: AuditActor) {
  if (!data.trackingNumber || typeof data.trackingNumber !== 'string' || !data.trackingNumber.trim()) {
    throw new DocumentValidationError('Tracking number is required and cannot be empty.');
  }
  if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
    throw new DocumentValidationError('Document title is required and cannot be empty.');
  }

  return await withTransaction(async (tx) => {
    const existing = await tx.select().from(documents).where(eq(documents.trackingNumber, data.trackingNumber.trim()));
    if (existing.length > 0) {
      throw new DocumentValidationError(`A document with tracking number "${data.trackingNumber}" already exists.`);
    }

    const docId = data.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    // Canonical bidirectional resolution
    const resp = await resolvePersonnelInfo(data.responsiblePersonId, data.responsiblePerson);
    const cust = await resolvePersonnelInfo(data.currentCustodianId, data.currentCustodian);
    const desk = await resolveDeskInfo(data.currentDeskId, data.currentLocation);

    const newDocValues = {
      id: docId,
      trackingNumber: data.trackingNumber.trim(),
      title: data.title.trim(),
      direction: data.direction || 'Incoming',
      documentType: data.documentType || 'General Communication',
      communicationType: data.communicationType || 'Internal Memo',
      reportType: data.reportType || 'N/A',
      originDepartment: data.originDepartment || 'General Records',
      dateReceived: data.dateReceived || now.toISOString().split('T')[0],
      timeReceived: data.timeReceived || now.toTimeString().split(' ')[0],
      targetDivision: data.targetDivision || 'Unassigned',
      responsiblePerson: resp.name,
      responsiblePersonId: resp.id,
      priority: data.priority || 'Routine',
      currentStatus: data.currentStatus || 'Received',
      currentLocation: desk.name,
      currentCustodian: cust.name,
      currentCustodianId: cust.id,
      currentDeskId: desk.id,
      fileLink: data.fileLink || null,
      version: 1,
      isCleared: data.managerClearance?.isCleared || false,
      clearedBy: data.managerClearance?.clearedBy || null,
      clearedAt: data.managerClearance?.clearedAt ? new Date(data.managerClearance.clearedAt) : null,
      clearanceType: data.managerClearance?.clearanceType || null,
      exitTrackingNumber: data.managerClearance?.exitTrackingNumber || null,
      forwardedToExternal: data.managerClearance?.forwardedToExternal || null,
      clearanceRemarks: data.managerClearance?.clearanceRemarks || null,
      createdAt: data.createdAt ? new Date(data.createdAt) : now,
      updatedAt: now,
    };

    const [inserted] = await tx.insert(documents).values(newDocValues).returning();

    // If initial movements provided, persist them
    if (Array.isArray(data.movements) && data.movements.length > 0) {
      for (const mov of data.movements) {
        if (!mov) continue;
        const movId = mov.id || `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await tx.insert(documentMovements).values({
          id: movId,
          documentId: docId,
          timestamp: mov.timestamp ? new Date(mov.timestamp) : now,
          personnelName: mov.personnelName || mov.actor?.name || inserted.currentCustodian,
          personnelRole: mov.personnelRole || mov.actor?.role || 'Staff',
          currentDesk: mov.fromDesk || mov.currentDesk || inserted.currentLocation,
          forwardToDesk: mov.toDesk || mov.forwardToDesk || inserted.currentLocation,
          statusUpdate: mov.statusUpdate || inserted.currentStatus,
          notes: mov.notes || null,
          fromDepartment: mov.fromDepartment || null,
          toDepartment: mov.toDepartment || inserted.targetDivision || null,
          fromPersonnelId: mov.fromPersonnelId ? Number(mov.fromPersonnelId) : null,
          toPersonnelId: mov.toPersonnelId ? Number(mov.toPersonnelId) : null,
          createdAt: now,
        });
      }
    }

    // Transactional audit log insertion
    await createAuditLog(
      {
        userId,
        actor,
        action: 'CREATE_DOCUMENT',
        entityType: 'document',
        entityId: inserted.id,
        newValue: inserted,
      },
      tx
    );

    return inserted;
  });
}

export async function updateExistingDocument(id: string, data: any, clientVersion?: number, userId?: string, actor?: AuditActor) {
  return await withTransaction(async (tx) => {
    const existing = await tx.select().from(documents).where(eq(documents.id, id));
    if (existing.length === 0) {
      throw new DocumentNotFoundError(id);
    }

    const currentDoc = existing[0];

    // Optimistic Concurrency check
    if (clientVersion !== undefined && clientVersion !== null && clientVersion !== currentDoc.version) {
      throw new DocumentConflictError(
        `Concurrency conflict: Document version is ${currentDoc.version}, but client expected ${clientVersion}.`
      );
    }

    const now = new Date();
    const nextVersion = currentDoc.version + 1;

    // Resolve relational references if updated
    const resp = (data.responsiblePersonId !== undefined || data.responsiblePerson !== undefined)
      ? await resolvePersonnelInfo(data.responsiblePersonId !== undefined ? (data.responsiblePersonId ? Number(data.responsiblePersonId) : null) : currentDoc.responsiblePersonId, data.responsiblePerson ?? currentDoc.responsiblePerson)
      : { id: currentDoc.responsiblePersonId, name: currentDoc.responsiblePerson };

    const cust = (data.currentCustodianId !== undefined || data.currentCustodian !== undefined)
      ? await resolvePersonnelInfo(data.currentCustodianId !== undefined ? (data.currentCustodianId ? Number(data.currentCustodianId) : null) : currentDoc.currentCustodianId, data.currentCustodian ?? currentDoc.currentCustodian)
      : { id: currentDoc.currentCustodianId, name: currentDoc.currentCustodian };

    const desk = (data.currentDeskId !== undefined || data.currentLocation !== undefined)
      ? await resolveDeskInfo(data.currentDeskId !== undefined ? (data.currentDeskId ? Number(data.currentDeskId) : null) : currentDoc.currentDeskId, data.currentLocation ?? currentDoc.currentLocation)
      : { id: currentDoc.currentDeskId, name: currentDoc.currentLocation };

    const updateFields: any = {
      title: data.title ?? currentDoc.title,
      direction: data.direction ?? currentDoc.direction,
      documentType: data.documentType ?? currentDoc.documentType,
      communicationType: data.communicationType ?? currentDoc.communicationType,
      reportType: data.reportType ?? currentDoc.reportType,
      originDepartment: data.originDepartment ?? currentDoc.originDepartment,
      dateReceived: data.dateReceived ?? currentDoc.dateReceived,
      timeReceived: data.timeReceived ?? currentDoc.timeReceived,
      targetDivision: data.targetDivision ?? currentDoc.targetDivision,
      responsiblePerson: resp.name,
      responsiblePersonId: resp.id,
      priority: data.priority ?? currentDoc.priority,
      currentStatus: data.currentStatus ?? currentDoc.currentStatus,
      currentLocation: desk.name,
      currentCustodian: cust.name,
      currentCustodianId: cust.id,
      currentDeskId: desk.id,
      fileLink: data.fileLink !== undefined ? data.fileLink : currentDoc.fileLink,
      version: nextVersion,
      updatedAt: now,
    };

    const hasClearanceUpdate = data.managerClearance !== undefined || data.isCleared !== undefined;
    if (hasClearanceUpdate) {
      const isCleared = data.managerClearance?.isCleared !== undefined
        ? Boolean(data.managerClearance.isCleared)
        : (data.isCleared !== undefined ? Boolean(data.isCleared) : Boolean(currentDoc.isCleared));

      const authActor = await getAuthoritativeUserById(userId);
      const clearedBy = isCleared ? (authActor?.name || data.managerClearance?.clearedBy || currentDoc.clearedBy || 'Authorized Manager') : null;
      const clearedByUserId = isCleared ? (authActor?.userId || null) : null;
      const clearedByPersonnelId = isCleared ? (authActor?.personnelId || null) : null;
      const clearedAt = isCleared ? (data.managerClearance?.clearedAt ? new Date(data.managerClearance.clearedAt) : (currentDoc.clearedAt || now)) : null;

      updateFields.isCleared = isCleared;
      updateFields.clearedBy = clearedBy;
      updateFields.clearedAt = clearedAt;
      updateFields.clearanceType = data.managerClearance?.clearanceType ?? (isCleared ? currentDoc.clearanceType : null);
      updateFields.exitTrackingNumber = isCleared ? (data.managerClearance?.exitTrackingNumber ?? currentDoc.exitTrackingNumber) : null;
      updateFields.forwardedToExternal = isCleared ? (data.managerClearance?.forwardedToExternal ?? currentDoc.forwardedToExternal) : null;
      updateFields.clearanceRemarks = data.managerClearance?.clearanceRemarks ?? currentDoc.clearanceRemarks;

      // Synchronously upsert manager_clearances inside transaction
      await tx
        .insert(managerClearances)
        .values({
          documentId: id,
          isCleared,
          clearedBy,
          clearedByUserId,
          clearedByPersonnelId,
          clearedAt,
          clearanceType: updateFields.clearanceType || null,
          exitTrackingNumber: updateFields.exitTrackingNumber || null,
          forwardedToExternal: updateFields.forwardedToExternal || null,
          clearanceRemarks: updateFields.clearanceRemarks || null,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: managerClearances.documentId,
          set: {
            isCleared,
            clearedBy,
            clearedByUserId,
            clearedByPersonnelId,
            clearedAt,
            clearanceType: updateFields.clearanceType || null,
            exitTrackingNumber: updateFields.exitTrackingNumber || null,
            forwardedToExternal: updateFields.forwardedToExternal || null,
            clearanceRemarks: updateFields.clearanceRemarks || null,
            updatedAt: now,
          },
        });
    }

    // Enforce atomic version check at SQL level inside transaction
    const [updated] = await tx
      .update(documents)
      .set(updateFields)
      .where(clientVersion ? sql`${documents.id} = ${id} AND ${documents.version} = ${clientVersion}` : eq(documents.id, id))
      .returning();

    if (!updated) {
      throw new DocumentConflictError('Document was concurrently updated by another user. Update aborted.');
    }

    // Persist any new movements attached to document update
    if (Array.isArray(data.movements) && data.movements.length > 0) {
      const existingMovs = await tx
        .select({ id: documentMovements.id })
        .from(documentMovements)
        .where(eq(documentMovements.documentId, id));
      const existingMovIds = new Set(existingMovs.map((m) => m.id));
      const newMovs = data.movements.filter((m: any) => m && m.id && !existingMovIds.has(m.id));
      for (const mov of newMovs) {
        await tx.insert(documentMovements).values({
          id: mov.id,
          documentId: id,
          personnelName: mov.personnelName || mov.actor?.name || currentDoc.currentCustodian || 'System',
          personnelRole: mov.personnelRole || mov.actor?.role || 'Staff',
          currentDesk: mov.fromDesk || mov.currentDesk || currentDoc.currentLocation,
          forwardToDesk: mov.toDesk || mov.forwardToDesk || updateFields.currentLocation,
          statusUpdate: mov.statusUpdate || 'updated',
          notes: mov.notes || null,
          fromDepartment: mov.fromDepartment || null,
          toDepartment: mov.toDepartment || updateFields.targetDivision || null,
          timestamp: mov.timestamp ? new Date(mov.timestamp) : now,
          createdAt: now,
        });
      }
    }

    // Persist or synchronize supervisor remarks (including compliance fulfillment)
    if (Array.isArray(data.supervisorRemarks) && data.supervisorRemarks.length > 0) {
      for (const rem of data.supervisorRemarks) {
        if (!rem || !rem.id) continue;
        const [existingRemark] = await tx
          .select()
          .from(documentRemarks)
          .where(eq(documentRemarks.id, rem.id));

        if (existingRemark) {
          // Update compliance status or notes
          await tx
            .update(documentRemarks)
            .set({
              complied: rem.complied !== undefined ? Boolean(rem.complied) : existingRemark.complied,
              complianceNotes: rem.complianceNotes !== undefined ? rem.complianceNotes : existingRemark.complianceNotes,
              compliedAt: rem.complied ? (rem.compliedAt ? new Date(rem.compliedAt) : now) : null,
              compliedBy: rem.complied ? (rem.compliedBy || actor?.name || 'Staff') : null,
            })
            .where(eq(documentRemarks.id, rem.id));
        } else {
          // Insert new remark
          await tx.insert(documentRemarks).values({
            id: rem.id,
            documentId: id,
            supervisorName: rem.supervisorName || rem.author?.name || actor?.name || 'Supervisor',
            supervisorUserId: rem.supervisorUserId ? Number(rem.supervisorUserId) : (actor?.userId ? Number(actor.userId) : null),
            supervisorPersonnelId: rem.supervisorPersonnelId ? Number(rem.supervisorPersonnelId) : null,
            timestamp: rem.timestamp ? new Date(rem.timestamp) : now,
            remarkText: rem.remarkText || rem.text || '',
            complianceRequired: Boolean(rem.complianceRequired),
            complied: Boolean(rem.complied),
            complianceNotes: rem.complianceNotes || null,
            compliedAt: rem.complied ? (rem.compliedAt ? new Date(rem.compliedAt) : now) : null,
            compliedBy: rem.complied ? (rem.compliedBy || actor?.name || 'Staff') : null,
            createdAt: now,
          });
        }
      }
    }

    // Transactional audit log insertion
    await createAuditLog(
      {
        userId,
        actor,
        action: 'UPDATE_DOCUMENT',
        entityType: 'document',
        entityId: id,
        oldValue: currentDoc,
        newValue: updated,
      },
      tx
    );

    return updated;
  });
}

export async function deleteDocumentById(id: string, userId?: string, actor?: AuditActor) {
  return await withTransaction(async (tx) => {
    const existing = await tx.select().from(documents).where(eq(documents.id, id));
    if (existing.length === 0) {
      throw new DocumentNotFoundError(id);
    }

    await tx.delete(documents).where(eq(documents.id, id));

    await createAuditLog(
      {
        userId,
        actor,
        action: 'DELETE_DOCUMENT',
        entityType: 'document',
        entityId: id,
        oldValue: existing[0],
      },
      tx
    );

    return { success: true };
  });
}

/**
 * Executes an atomic document routing operation inside a PostgreSQL transaction.
 * 1. Checks document existence and locks/updates document location, custodian, and status.
 * 2. Increments document concurrency version.
 * 3. Appends movement history record.
 * 4. Logs audit entry within the same transaction.
 */
export async function routeDocumentWithTransaction(
  documentId: string,
  movementData: {
    personnelName?: string;
    personnelRole?: string;
    currentDesk: string;
    forwardToDesk: string;
    statusUpdate: string;
    notes?: string;
    fromDepartment?: string;
    toDepartment?: string;
    toPersonnelName?: string;
    fromPersonnelId?: number;
    toPersonnelId?: number;
    actorUserId?: number;
    fromDeskId?: number;
    toDeskId?: number;
  },
  userId?: string,
  actor?: AuditActor
) {
  return await withTransaction(async (tx) => {
    // 1. Fetch current document state
    const [doc] = await tx.select().from(documents).where(eq(documents.id, documentId));
    if (!doc) {
      throw new DocumentNotFoundError(documentId);
    }

    const now = new Date();
    const movementId = `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Resolve authoritative actor strictly from PostgreSQL user or authenticated actor
    let actorName = actor?.name || movementData.personnelName || 'Authorized Custodian';
    let actorRole = actor?.role || movementData.personnelRole || 'Staff';
    let actorUserId = actor?.userId || movementData.actorUserId || (userId ? Number(userId) : null);
    let fromPersonnelId = movementData.fromPersonnelId ? Number(movementData.fromPersonnelId) : null;

    if (actorUserId) {
      const auth = await getAuthoritativeUserById(actorUserId);
      if (auth) {
        actorName = auth.name;
        actorRole = auth.role;
        fromPersonnelId = fromPersonnelId || auth.personnelId;
      }
    }

    // Resolve target desk and custodian
    const targetDesk = await resolveDeskInfo(movementData.toDeskId ? Number(movementData.toDeskId) : null, movementData.forwardToDesk);
    const targetCust = movementData.toPersonnelId
      ? await resolvePersonnelInfo(Number(movementData.toPersonnelId), null)
      : (movementData.toPersonnelName ? await resolvePersonnelInfo(null, movementData.toPersonnelName) : { id: null, name: actorName });

    // 2. Insert movement audit record
    const [movement] = await tx
      .insert(documentMovements)
      .values({
        id: movementId,
        documentId,
        timestamp: now,
        personnelName: actorName,
        personnelRole: actorRole,
        currentDesk: movementData.currentDesk || doc.currentLocation,
        forwardToDesk: targetDesk.name,
        statusUpdate: movementData.statusUpdate || doc.currentStatus,
        notes: movementData.notes || null,
        fromDepartment: movementData.fromDepartment || null,
        toDepartment: movementData.toDepartment || null,
        fromPersonnelId,
        toPersonnelId: targetCust.id,
        actorUserId: actorUserId ? Number(actorUserId) : null,
        fromDeskId: movementData.fromDeskId ? Number(movementData.fromDeskId) : doc.currentDeskId,
        toDeskId: targetDesk.id,
        routedAt: now,
        createdBy: userId || actorName,
        createdAt: now,
      })
      .returning();

    // 3. Atomically update document status, location, custodian and increment version
    const [updatedDoc] = await tx
      .update(documents)
      .set({
        currentLocation: targetDesk.name,
        currentCustodian: targetCust.id ? targetCust.name : actorName,
        currentStatus: movementData.statusUpdate || doc.currentStatus,
        currentDeskId: targetDesk.id,
        currentCustodianId: targetCust.id,
        version: doc.version + 1,
        updatedAt: now,
      })
      .where(eq(documents.id, documentId))
      .returning();

    // 4. Log audit record transactionally
    await createAuditLog(
      {
        userId: userId || (actorUserId ? String(actorUserId) : null),
        actor,
        action: 'ROUTE_DOCUMENT',
        entityType: 'document',
        entityId: documentId,
        oldValue: { location: doc.currentLocation, custodian: doc.currentCustodian, status: doc.currentStatus },
        newValue: { location: updatedDoc.currentLocation, custodian: updatedDoc.currentCustodian, status: updatedDoc.currentStatus, movementId },
      },
      tx
    );

    return { document: updatedDoc, movement };
  });
}

export async function addDocumentRemark(
  documentId: string,
  remarkData: {
    supervisorName?: string;
    remarkText: string;
    complianceRequired?: boolean;
    complianceNotes?: string;
    supervisorUserId?: number;
    supervisorPersonnelId?: number;
  },
  userId?: string,
  actor?: AuditActor
) {
  return await withTransaction(async (tx) => {
    const [doc] = await tx.select().from(documents).where(eq(documents.id, documentId));
    if (!doc) {
      throw new DocumentNotFoundError(documentId);
    }

    const remarkId = `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    // Resolve authoritative supervisor strictly from PostgreSQL user if available
    let supervisorName = actor?.name || remarkData.supervisorName || 'Supervisor';
    let supervisorUserId = actor?.userId || remarkData.supervisorUserId || (userId ? Number(userId) : null);
    let supervisorPersonnelId = remarkData.supervisorPersonnelId ? Number(remarkData.supervisorPersonnelId) : null;

    if (supervisorUserId) {
      const auth = await getAuthoritativeUserById(supervisorUserId);
      if (auth) {
        supervisorName = auth.name;
        supervisorPersonnelId = supervisorPersonnelId || auth.personnelId;
      }
    }

    const [remark] = await tx
      .insert(documentRemarks)
      .values({
        id: remarkId,
        documentId,
        supervisorName,
        supervisorUserId: supervisorUserId ? Number(supervisorUserId) : null,
        supervisorPersonnelId: supervisorPersonnelId ? Number(supervisorPersonnelId) : null,
        remarkText: remarkData.remarkText,
        complianceRequired: remarkData.complianceRequired || false,
        complianceNotes: remarkData.complianceNotes || null,
        createdAt: now,
        timestamp: now,
      })
      .returning();

    await createAuditLog(
      {
        userId,
        actor,
        action: 'ADD_REMARK',
        entityType: 'document',
        entityId: documentId,
        newValue: remark,
      },
      tx
    );

    return remark;
  });
}

export async function addDocumentClearance(
  documentId: string,
  clearanceData: {
    clearedBy?: string;
    clearanceType?: string;
    exitTrackingNumber?: string;
    forwardedToExternal?: string;
    clearanceRemarks?: string;
    isCleared?: boolean;
    clearedByUserId?: number;
    clearedByPersonnelId?: number;
    currentStatus?: string;
  },
  userId?: string,
  actor?: AuditActor
) {
  return await withTransaction(async (tx) => {
    const [doc] = await tx.select().from(documents).where(eq(documents.id, documentId));
    if (!doc) {
      throw new DocumentNotFoundError(documentId);
    }

    const now = new Date();
    // Default to true only if not specified, but respect explicit boolean
    const isCleared = clearanceData.isCleared !== undefined ? Boolean(clearanceData.isCleared) : true;

    // Resolve authoritative actor strictly from PostgreSQL user
    let actorUserId = actor?.userId || clearanceData.clearedByUserId || (userId ? Number(userId) : null);
    let actorName = actor?.name || clearanceData.clearedBy || 'Authorized Manager';
    let actorPersonnelId = clearanceData.clearedByPersonnelId || null;

    if (actorUserId) {
      const [u] = await tx
        .select({ id: users.id, username: users.username, role: users.role })
        .from(users)
        .where(eq(users.id, Number(actorUserId)));
      if (u) {
        actorName = u.username || actorName;
        const [p] = await tx
          .select({ id: personnel.id, name: personnel.name })
          .from(personnel)
          .where(eq(personnel.userId, u.id));
        if (p) {
          actorName = p.name || actorName;
          actorPersonnelId = actorPersonnelId || p.id;
        }
      }
    }

    const clearedBy = isCleared ? actorName : null;
    const clearedAt = isCleared ? now : null;
    const clearedByUserId = isCleared ? Number(actorUserId) : null;
    const clearedByPersonnelId = isCleared ? actorPersonnelId : null;

    // Determine target document status
    let nextStatus = doc.currentStatus;
    if (isCleared) {
      if (clearanceData.clearanceType === 'approved_for_dispatch') {
        nextStatus = 'Cleared for Out';
      } else if (clearanceData.clearanceType === 'archived_completed') {
        nextStatus = 'Dispatched / Completed';
      } else {
        nextStatus = 'Cleared for Out';
      }
    } else {
      // Returned for revision or revoked
      if (clearanceData.clearanceType === 'returned_for_revision') {
        nextStatus = 'Under Review';
      } else {
        nextStatus = 'Under Review';
      }
    }
    if (clearanceData.currentStatus) {
      nextStatus = clearanceData.currentStatus;
    }

    // 1. Upsert into manager_clearances (Authoritative Source of Truth)
    const [clearance] = await tx
      .insert(managerClearances)
      .values({
        documentId,
        isCleared,
        clearedBy,
        clearedByUserId,
        clearedByPersonnelId,
        clearedAt,
        clearanceType: clearanceData.clearanceType || null,
        exitTrackingNumber: isCleared ? (clearanceData.exitTrackingNumber || null) : null,
        forwardedToExternal: isCleared ? (clearanceData.forwardedToExternal || null) : null,
        clearanceRemarks: clearanceData.clearanceRemarks || null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: managerClearances.documentId,
        set: {
          isCleared,
          clearedBy,
          clearedByUserId,
          clearedByPersonnelId,
          clearedAt,
          clearanceType: clearanceData.clearanceType || null,
          exitTrackingNumber: isCleared ? (clearanceData.exitTrackingNumber || null) : null,
          forwardedToExternal: isCleared ? (clearanceData.forwardedToExternal || null) : null,
          clearanceRemarks: clearanceData.clearanceRemarks || null,
          updatedAt: now,
        },
      })
      .returning();

    // 2. Synchronize legacy columns on documents table in same transaction
    const [updatedDoc] = await tx
      .update(documents)
      .set({
        isCleared,
        clearedBy,
        clearedAt,
        clearanceType: clearanceData.clearanceType || null,
        exitTrackingNumber: isCleared ? (clearanceData.exitTrackingNumber || null) : null,
        forwardedToExternal: isCleared ? (clearanceData.forwardedToExternal || null) : null,
        clearanceRemarks: clearanceData.clearanceRemarks || null,
        currentStatus: nextStatus,
        version: doc.version + 1,
        updatedAt: now,
      })
      .where(eq(documents.id, documentId))
      .returning();

    // 3. Log audit event transactionally
    await createAuditLog(
      {
        userId: userId || (actorUserId ? String(actorUserId) : null),
        actor,
        action: isCleared ? 'CLEAR_DOCUMENT' : 'REVOKE_CLEARANCE',
        entityType: 'document',
        entityId: documentId,
        oldValue: { isCleared: doc.isCleared, clearedBy: doc.clearedBy, status: doc.currentStatus },
        newValue: {
          isCleared,
          clearedBy,
          clearedAt,
          status: nextStatus,
          clearanceType: clearanceData.clearanceType,
          remarks: clearanceData.clearanceRemarks,
        },
      },
      tx
    );

    return {
      document: formatDocumentWithClearance(updatedDoc, clearance),
      clearance,
    };
  });
}

/**
 * Explicitly revokes or returns document clearance for revision.
 * Transactionally updates manager_clearances (authoritative) and legacy documents columns,
 * reverting document status to 'Under Review' (or specified return status) and logging the audit event.
 */
export async function revokeDocumentClearance(
  documentId: string,
  revokeData: {
    reason?: string;
    returnStatus?: string;
  } = {},
  userId?: string,
  actor?: AuditActor
) {
  return await addDocumentClearance(
    documentId,
    {
      isCleared: false,
      clearanceType: 'returned_for_revision',
      clearanceRemarks: revokeData.reason || 'Clearance revoked / returned for revision.',
      currentStatus: revokeData.returnStatus || 'Under Review',
    },
    userId,
    actor
  );
}


