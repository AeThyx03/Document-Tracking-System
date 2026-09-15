import { eq, and, or, ilike, sql, desc, asc } from 'drizzle-orm';
import { db, withTransaction } from '../db/index.ts';
import { documents, documentMovements, documentRemarks, managerClearances, auditLogs } from '../db/schema.ts';
import { createAuditLog } from './auditService.ts';

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

export interface DocumentFilterOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  division?: string;
  priority?: string;
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

  if (options?.status && options.status !== 'All') {
    conditions.push(eq(documents.currentStatus, options.status));
  }

  if (options?.division && options.division !== 'All') {
    conditions.push(eq(documents.targetDivision, options.division));
  }

  if (options?.priority && options.priority !== 'All') {
    conditions.push(eq(documents.priority, options.priority));
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
        ilike(documents.currentCustodian, q)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Sorting
  const sortCol = options?.sort || 'updatedAt';
  const isAsc = options?.sortDirection === 'asc';
  const sortFn = isAsc ? asc : desc;

  let orderColumn: any = documents.updatedAt;
  if (sortCol === 'createdAt') orderColumn = documents.createdAt;
  else if (sortCol === 'trackingNumber') orderColumn = documents.trackingNumber;
  else if (sortCol === 'title') orderColumn = documents.title;
  else if (sortCol === 'priority') orderColumn = documents.priority;
  else if (sortCol === 'currentStatus') orderColumn = documents.currentStatus;

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
    },
    orderBy: [sortFn(orderColumn)],
  };

  if (page && pageSize) {
    queryBuilder.limit = pageSize;
    queryBuilder.offset = (page - 1) * pageSize;
  }

  const rawDocs = await db.query.documents.findMany(queryBuilder);

  const mapped = rawDocs.map((d) => {
    // Deterministic chronological movement ordering (Requirement 14: timestamp ASC, created_at ASC, id ASC)
    const sortedMovements = (d.movements || []).sort((a: any, b: any) => {
      const timeDiff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      if (timeDiff !== 0) return timeDiff;
      return String(a.id).localeCompare(String(b.id));
    });

    const latestMovement = sortedMovements.length > 0 ? sortedMovements[sortedMovements.length - 1] : null;

    return {
      ...d,
      movements: sortedMovements,
      latestMovement,
      supervisorRemarks: d.remarks,
      managerClearance: {
        isCleared: d.isCleared,
        clearedBy: d.clearedBy,
        clearedAt: d.clearedAt,
        clearanceType: d.clearanceType,
        exitTrackingNumber: d.exitTrackingNumber,
        forwardedToExternal: d.forwardedToExternal,
        clearanceRemarks: d.clearanceRemarks,
      },
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
    },
  });

  if (!doc) {
    throw new DocumentNotFoundError(id);
  }

  return {
    ...doc,
    supervisorRemarks: doc.remarks,
    managerClearance: {
      isCleared: doc.isCleared,
      clearedBy: doc.clearedBy,
      clearedAt: doc.clearedAt,
      clearanceType: doc.clearanceType,
      exitTrackingNumber: doc.exitTrackingNumber,
      forwardedToExternal: doc.forwardedToExternal,
      clearanceRemarks: doc.clearanceRemarks,
    },
  };
}

export async function createNewDocument(data: any, userId?: string) {
  if (!data.trackingNumber || typeof data.trackingNumber !== 'string' || !data.trackingNumber.trim()) {
    throw new DocumentValidationError('Tracking number is required and cannot be empty.');
  }
  if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
    throw new DocumentValidationError('Document title is required and cannot be empty.');
  }

  const existing = await db.select().from(documents).where(eq(documents.trackingNumber, data.trackingNumber.trim()));
  if (existing.length > 0) {
    throw new DocumentValidationError(`A document with tracking number "${data.trackingNumber}" already exists.`);
  }

  const docId = data.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();

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
    responsiblePerson: data.responsiblePerson || 'Unassigned',
    responsiblePersonId: data.responsiblePersonId ? Number(data.responsiblePersonId) : null,
    priority: data.priority || 'Routine',
    currentStatus: data.currentStatus || 'Received',
    currentLocation: data.currentLocation || 'Receiving Desk',
    currentCustodian: data.currentCustodian || 'Records Officer',
    currentCustodianId: data.currentCustodianId ? Number(data.currentCustodianId) : null,
    currentDeskId: data.currentDeskId ? Number(data.currentDeskId) : null,
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

  const [inserted] = await db.insert(documents).values(newDocValues).returning();

  await createAuditLog({
    userId,
    action: 'CREATE_DOCUMENT',
    entityType: 'document',
    entityId: inserted.id,
    newValue: inserted,
  });

  return inserted;
}

export async function updateExistingDocument(id: string, data: any, clientVersion?: number, userId?: string) {
  const existing = await db.select().from(documents).where(eq(documents.id, id));
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
    responsiblePerson: data.responsiblePerson ?? currentDoc.responsiblePerson,
    responsiblePersonId: data.responsiblePersonId !== undefined ? (data.responsiblePersonId ? Number(data.responsiblePersonId) : null) : currentDoc.responsiblePersonId,
    priority: data.priority ?? currentDoc.priority,
    currentStatus: data.currentStatus ?? currentDoc.currentStatus,
    currentLocation: data.currentLocation ?? currentDoc.currentLocation,
    currentCustodian: data.currentCustodian ?? currentDoc.currentCustodian,
    currentCustodianId: data.currentCustodianId !== undefined ? (data.currentCustodianId ? Number(data.currentCustodianId) : null) : currentDoc.currentCustodianId,
    currentDeskId: data.currentDeskId !== undefined ? (data.currentDeskId ? Number(data.currentDeskId) : null) : currentDoc.currentDeskId,
    fileLink: data.fileLink !== undefined ? data.fileLink : currentDoc.fileLink,
    version: nextVersion,
    updatedAt: now,
  };

  if (data.managerClearance) {
    updateFields.isCleared = data.managerClearance.isCleared ?? currentDoc.isCleared;
    updateFields.clearedBy = data.managerClearance.clearedBy ?? currentDoc.clearedBy;
    updateFields.clearedAt = data.managerClearance.clearedAt ? new Date(data.managerClearance.clearedAt) : currentDoc.clearedAt;
    updateFields.clearanceType = data.managerClearance.clearanceType ?? currentDoc.clearanceType;
    updateFields.exitTrackingNumber = data.managerClearance.exitTrackingNumber ?? currentDoc.exitTrackingNumber;
    updateFields.forwardedToExternal = data.managerClearance.forwardedToExternal ?? currentDoc.forwardedToExternal;
    updateFields.clearanceRemarks = data.managerClearance.clearanceRemarks ?? currentDoc.clearanceRemarks;
  }

  // Enforce atomic version check at SQL level
  const [updated] = await db
    .update(documents)
    .set(updateFields)
    .where(clientVersion ? sql`${documents.id} = ${id} AND ${documents.version} = ${clientVersion}` : eq(documents.id, id))
    .returning();

  if (!updated) {
    throw new DocumentConflictError('Document was concurrently updated by another user. Update aborted.');
  }

  await createAuditLog({
    userId,
    action: 'UPDATE_DOCUMENT',
    entityType: 'document',
    entityId: id,
    oldValue: currentDoc,
    newValue: updated,
  });

  return updated;
}

export async function deleteDocumentById(id: string, userId?: string) {
  const existing = await db.select().from(documents).where(eq(documents.id, id));
  if (existing.length === 0) {
    throw new DocumentNotFoundError(id);
  }

  await db.delete(documents).where(eq(documents.id, id));

  await createAuditLog({
    userId,
    action: 'DELETE_DOCUMENT',
    entityType: 'document',
    entityId: id,
    oldValue: existing[0],
  });

  return { success: true };
}

/**
 * Executes an atomic document routing operation inside a PostgreSQL transaction.
 * 1. Checks document existence and locks/updates document location, custodian, and status.
 * 2. Increments document concurrency version.
 * 3. Appends movement history record.
 * 4. Logs audit entry.
 */
export async function routeDocumentWithTransaction(
  documentId: string,
  movementData: {
    personnelName: string;
    personnelRole?: string;
    currentDesk: string;
    forwardToDesk: string;
    statusUpdate: string;
    notes?: string;
    fromDepartment?: string;
    toDepartment?: string;
    fromPersonnelId?: number;
    toPersonnelId?: number;
    actorUserId?: number;
    fromDeskId?: number;
    toDeskId?: number;
  },
  userId?: string
) {
  return await withTransaction(async (tx) => {
    // 1. Fetch current document state
    const [doc] = await tx.select().from(documents).where(eq(documents.id, documentId));
    if (!doc) {
      throw new DocumentNotFoundError(documentId);
    }

    const now = new Date();
    const movementId = `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 2. Insert movement audit record
    const [movement] = await tx
      .insert(documentMovements)
      .values({
        id: movementId,
        documentId,
        timestamp: now,
        personnelName: movementData.personnelName,
        personnelRole: movementData.personnelRole,
        currentDesk: movementData.currentDesk,
        forwardToDesk: movementData.forwardToDesk,
        statusUpdate: movementData.statusUpdate,
        notes: movementData.notes,
        fromDepartment: movementData.fromDepartment,
        toDepartment: movementData.toDepartment,
        fromPersonnelId: movementData.fromPersonnelId ? Number(movementData.fromPersonnelId) : null,
        toPersonnelId: movementData.toPersonnelId ? Number(movementData.toPersonnelId) : null,
        actorUserId: movementData.actorUserId ? Number(movementData.actorUserId) : null,
        fromDeskId: movementData.fromDeskId ? Number(movementData.fromDeskId) : null,
        toDeskId: movementData.toDeskId ? Number(movementData.toDeskId) : null,
        routedAt: now,
        createdBy: userId || movementData.personnelName,
        createdAt: now,
      })
      .returning();

    // 3. Atomically update document status, location, custodian and increment version
    const [updatedDoc] = await tx
      .update(documents)
      .set({
        currentLocation: movementData.forwardToDesk,
        currentCustodian: movementData.personnelName,
        currentStatus: movementData.statusUpdate,
        currentDeskId: movementData.toDeskId ? Number(movementData.toDeskId) : doc.currentDeskId,
        currentCustodianId: movementData.toPersonnelId ? Number(movementData.toPersonnelId) : doc.currentCustodianId,
        version: doc.version + 1,
        updatedAt: now,
      })
      .where(eq(documents.id, documentId))
      .returning();

    // 4. Log audit record
    await tx.insert(auditLogs).values({
      userId: userId || null,
      action: 'ROUTE_DOCUMENT',
      entityType: 'document',
      entityId: documentId,
      oldValue: { location: doc.currentLocation, custodian: doc.currentCustodian, status: doc.currentStatus },
      newValue: { location: updatedDoc.currentLocation, custodian: updatedDoc.currentCustodian, status: updatedDoc.currentStatus, movementId },
      timestamp: now,
    });

    return { document: updatedDoc, movement };
  });
}

export async function addDocumentRemark(
  documentId: string,
  remarkData: {
    supervisorName: string;
    remarkText: string;
    complianceRequired?: boolean;
    complianceNotes?: string;
    supervisorUserId?: number;
    supervisorPersonnelId?: number;
  },
  userId?: string
) {
  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
  if (!doc) {
    throw new DocumentNotFoundError(documentId);
  }

  const remarkId = `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();

  const [remark] = await db
    .insert(documentRemarks)
    .values({
      id: remarkId,
      documentId,
      supervisorName: remarkData.supervisorName,
      supervisorUserId: remarkData.supervisorUserId ? Number(remarkData.supervisorUserId) : null,
      supervisorPersonnelId: remarkData.supervisorPersonnelId ? Number(remarkData.supervisorPersonnelId) : null,
      remarkText: remarkData.remarkText,
      complianceRequired: remarkData.complianceRequired || false,
      complianceNotes: remarkData.complianceNotes || null,
      createdAt: now,
      timestamp: now,
    })
    .returning();

  await createAuditLog({
    userId,
    action: 'ADD_REMARK',
    entityType: 'document',
    entityId: documentId,
    newValue: remark,
  });

  return remark;
}

export async function addDocumentClearance(
  documentId: string,
  clearanceData: {
    clearedBy: string;
    clearanceType?: string;
    exitTrackingNumber?: string;
    forwardedToExternal?: string;
    clearanceRemarks?: string;
    isCleared?: boolean;
    clearedByUserId?: number;
    clearedByPersonnelId?: number;
  },
  userId?: string
) {
  return await withTransaction(async (tx) => {
    const [doc] = await tx.select().from(documents).where(eq(documents.id, documentId));
    if (!doc) {
      throw new DocumentNotFoundError(documentId);
    }

    const now = new Date();
    const isCleared = clearanceData.isCleared !== undefined ? clearanceData.isCleared : true;

    // 1. Upsert into manager_clearances
    const [clearance] = await tx
      .insert(managerClearances)
      .values({
        documentId,
        isCleared,
        clearedBy: clearanceData.clearedBy,
        clearedByUserId: clearanceData.clearedByUserId || null,
        clearedByPersonnelId: clearanceData.clearedByPersonnelId || null,
        clearedAt: now,
        clearanceType: clearanceData.clearanceType || null,
        exitTrackingNumber: clearanceData.exitTrackingNumber || null,
        forwardedToExternal: clearanceData.forwardedToExternal || null,
        clearanceRemarks: clearanceData.clearanceRemarks || null,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: managerClearances.documentId,
        set: {
          isCleared,
          clearedBy: clearanceData.clearedBy,
          clearedAt: now,
          clearanceType: clearanceData.clearanceType || null,
          exitTrackingNumber: clearanceData.exitTrackingNumber || null,
          forwardedToExternal: clearanceData.forwardedToExternal || null,
          clearanceRemarks: clearanceData.clearanceRemarks || null,
        },
      })
      .returning();

    // 2. Update document clearance status and increment version
    const [updatedDoc] = await tx
      .update(documents)
      .set({
        isCleared,
        clearedBy: clearanceData.clearedBy,
        clearedAt: now,
        clearanceType: clearanceData.clearanceType || null,
        exitTrackingNumber: clearanceData.exitTrackingNumber || null,
        forwardedToExternal: clearanceData.forwardedToExternal || null,
        clearanceRemarks: clearanceData.clearanceRemarks || null,
        currentStatus: isCleared ? 'Cleared' : doc.currentStatus,
        version: doc.version + 1,
        updatedAt: now,
      })
      .where(eq(documents.id, documentId))
      .returning();

    // 3. Log audit
    await tx.insert(auditLogs).values({
      userId: userId || null,
      action: isCleared ? 'CLEAR_DOCUMENT' : 'REVOKE_CLEARANCE',
      entityType: 'document',
      entityId: documentId,
      oldValue: { isCleared: doc.isCleared, clearedBy: doc.clearedBy },
      newValue: clearance,
      timestamp: now,
    });

    return { document: updatedDoc, clearance };
  });
}

