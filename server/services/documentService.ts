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
import { getDropdownOptionsGrouped } from './dropdownService.ts';
import { getAuthoritativeSlaConfig, isDocumentOverdue } from './slaService.ts';


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

export const CANONICAL_LIFECYCLE_STATUSES = [
  'Incoming Logged',
  'Assigned',
  'Under Review',
  'Supervisor Comment Needed',
  'Complied / Ready for Clearance',
  'Cleared for Out',
  'Dispatched / Completed',
] as const;

export type CanonicalLifecycleStatus = typeof CANONICAL_LIFECYCLE_STATUSES[number];

export function isCanonicalLifecycleStatus(status: any): status is CanonicalLifecycleStatus {
  return typeof status === 'string' && CANONICAL_LIFECYCLE_STATUSES.includes(status as any);
}

export async function validateBackendLifecycleTransition(
  tx: any,
  docId: string,
  currentStatus: string,
  targetStatus: string,
  actor?: AuditActor
): Promise<{ valid: boolean; reason?: string }> {
  if (currentStatus === targetStatus) {
    return { valid: true };
  }

  if (!isCanonicalLifecycleStatus(targetStatus)) {
    return {
      valid: false,
      reason: `Invalid status "${targetStatus}". Status must be one of the canonical POSSD lifecycle statuses: ${CANONICAL_LIFECYCLE_STATUSES.join(', ')}.`,
    };
  }

  // Terminal State Guard: Once Dispatched / Completed, changes require explicit administrative re-opening
  if (currentStatus === 'Dispatched / Completed') {
    const isPrivileged = actor?.role && ['System Admin', 'Department Manager'].includes(actor.role);
    if (!isPrivileged) {
      return {
        valid: false,
        reason: `Document is already Dispatched / Completed and archived. Only Department Managers or System Admins can modify completed entries.`,
      };
    }
  }

  // Uncomplied Supervisor Remarks Guard:
  if (
    targetStatus === 'Cleared for Out' ||
    targetStatus === 'Dispatched / Completed' ||
    targetStatus === 'Complied / Ready for Clearance'
  ) {
    const unresolvedRemarks = await tx
      .select()
      .from(documentRemarks)
      .where(and(
        eq(documentRemarks.documentId, docId),
        eq(documentRemarks.complianceRequired, true),
        eq(documentRemarks.complied, false)
      ));

    if (unresolvedRemarks.length > 0) {
      return {
        valid: false,
        reason: `Cannot transition to "${targetStatus}": Document has ${unresolvedRemarks.length} uncomplied supervisor directive(s).`,
      };
    }
  }

  // Manager Clearance Guard for "Cleared for Out"
  if (targetStatus === 'Cleared for Out') {
    const [clearance] = await tx
      .select()
      .from(managerClearances)
      .where(eq(managerClearances.documentId, docId));

    const [doc] = await tx.select({ isCleared: documents.isCleared }).from(documents).where(eq(documents.id, docId));
    const isCleared = clearance ? Boolean(clearance.isCleared) : Boolean(doc?.isCleared);

    if (!isCleared) {
      return {
        valid: false,
        reason: `Cannot transition to "Cleared for Out": Executive Manager Clearance is required.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Resolves canonical personnel name and ID bidirectionally.
 * Prioritizes ID if present; otherwise queries by name.
 */
export async function resolvePersonnelInfo(id?: number | null, name?: string | null): Promise<{ id: number | null; name: string; status?: string; isFocalPerson?: boolean }> {
  if (id) {
    const [p] = await db.select().from(personnel).where(eq(personnel.id, Number(id)));
    if (p) return { id: p.id, name: p.name, status: p.status || 'active', isFocalPerson: p.isFocalPerson || false };
    throw new DocumentValidationError("Invalid personnel ID provided.");
  }
  if (name && name.trim() && name !== 'Unassigned' && name !== 'Records Officer') {
    const [p] = await db.select().from(personnel).where(ilike(personnel.name, name.trim()));
    if (p) return { id: p.id, name: p.name, status: p.status || 'active', isFocalPerson: p.isFocalPerson || false };
  }
  return { id: id ? Number(id) : null, name: name || 'Unassigned', status: 'active', isFocalPerson: false };
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
  const isActuallyCleared = mc ? Boolean(mc.isCleared) : Boolean(d?.isCleared);
  const managerClearance = {
    isCleared: isActuallyCleared,
    clearedBy: isActuallyCleared ? (mc?.clearedBy || d?.clearedBy || null) : null,
    clearedAt: isActuallyCleared ? (mc?.clearedAt ? new Date(mc.clearedAt).toISOString() : (d?.clearedAt ? new Date(d.clearedAt).toISOString() : null)) : null,
    clearanceType: isActuallyCleared ? (mc?.clearanceType || d?.clearanceType || null) : (mc?.clearanceType === 'returned_for_revision' || d?.clearanceType === 'returned_for_revision' ? 'returned_for_revision' : null),
    exitTrackingNumber: isActuallyCleared ? (mc?.exitTrackingNumber || d?.exitTrackingNumber || null) : null,
    forwardedToExternal: isActuallyCleared ? (mc?.forwardedToExternal || d?.forwardedToExternal || null) : null,
    clearanceRemarks: mc?.clearanceRemarks || d?.clearanceRemarks || null,
  };

  const docClassification = d?.documentClassification || d?.direction || 'Incoming';
  const txType = d?.transactionType || d?.documentType || 'Simple Transaction';

  return {
    ...d,
    documentClassification: docClassification,
    transactionType: txType,
    direction: d?.direction || docClassification,
    documentType: d?.documentType || txType,
    isCleared: isActuallyCleared,
    clearedBy: isActuallyCleared ? (mc?.clearedBy || d?.clearedBy || null) : null,
    clearedAt: isActuallyCleared ? (mc?.clearedAt ? new Date(mc.clearedAt).toISOString() : (d?.clearedAt ? new Date(d.clearedAt).toISOString() : null)) : null,
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
  totalMonitoredCount?: number;
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

  // Count total matches for the active filter/view
  const [countRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documents)
    .where(whereClause);
  const totalCount = countRes?.count || 0;

  // Authoritative total number of ALL logged documents in the archive (unfiltered)
  const [unfilteredRes] = await db
    .select({ 
      count: sql<number>`count(*)::int`,
      clearedCount: sql<number>`count(*) filter (where ${documents.isCleared} = true)::int`
    })
    .from(documents);
  
  const clearedForOutCount = unfilteredRes?.clearedCount || 0;

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

  // Fetch active docs for SLA check
  const activeDocs = await db.query.documents.findMany({
    where: eq(documents.isCleared, false),
    with: {
      movements: true,
      remarks: true,
    }
  });

  const slaConfig = await getAuthoritativeSlaConfig();
  const now = new Date();
  let overdueCount = 0;
  let pendingComplianceCount = 0;
  let ongoingCount = 0;

  for (const doc of activeDocs) {
    const { isOverdue } = isDocumentOverdue(doc, slaConfig, now);
    const hasRemarks = doc.remarks?.some((r: any) => r.complianceRequired && !r.complied);

    if (isOverdue) {
      overdueCount++;
    } else if (hasRemarks) {
      pendingComplianceCount++;
    } else {
      ongoingCount++;
    }
  }

  const results = {
    documents: mapped,
    totalCount,
    totalMonitoredCount: ongoingCount + pendingComplianceCount + overdueCount + clearedForOutCount,
    ongoingCount,
    pendingComplianceCount,
    overdueCount,
    clearedForOutCount,
    page: page ?? 1,
    pageSize: pageSize ?? mapped.length,
    totalPages: pageSize ? Math.ceil(totalCount / pageSize) : 1,
  };

  return results;
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

  const activeOptions = await getDropdownOptionsGrouped({ includeInactive: false });
  const validateDropdown = (category: string, value: string | undefined, label: string) => {
    if (!value) return;
    const items = activeOptions[category] || [];
    if (!items.some(opt => opt.value === value)) {
      throw new DocumentValidationError(`Invalid or deactivated ${label} selected: "${value}". Please refresh your options.`);
    }
  };

  const docClassification = data.documentClassification || data.direction || 'Incoming';
  const txType = data.transactionType || data.documentType || 'Simple Transaction';

  validateDropdown('document_classification', docClassification, 'Document Classification');
  validateDropdown('transaction_type', txType, 'Transaction Type');
  
  if (data.communicationType && data.communicationType !== 'N/A') validateDropdown('communication_type', data.communicationType, 'Communication Type');
  if (data.reportType && data.reportType !== 'N/A') validateDropdown('report_type', data.reportType, 'Report Type');
  if (data.originDepartment && data.originDepartment !== 'General Records') validateDropdown('originating_agency', data.originDepartment, 'Originating Department / Agency');
  if (data.targetDivision && data.targetDivision !== 'Unassigned') validateDropdown('target_division', data.targetDivision, 'Target Division');
  if (data.priority && data.priority !== 'Routine') validateDropdown('priority_level', data.priority, 'Priority Level');

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
    
    // Fallback resolution for Focal Person
    let resp;
    if (data.responsiblePersonId) {
      const [focalP] = await tx.select().from(personnel).where(eq(personnel.id, Number(data.responsiblePersonId)));
      if (focalP) {
        resp = { id: focalP.id, name: focalP.name };
      } else {
        resp = { id: null, name: data.responsiblePerson || 'Unassigned' };
      }
    } else {
      resp = { id: null, name: data.responsiblePerson || 'Unassigned' };
    }

    const cust = await resolvePersonnelInfo(data.currentCustodianId, data.currentCustodian);
    const desk = await resolveDeskInfo(data.currentDeskId, data.currentLocation);

    const docClassification = data.documentClassification || data.direction || 'Incoming';
    const txType = data.transactionType || data.documentType || 'Simple Transaction';

    const newDocValues = {
      id: docId,
      trackingNumber: data.trackingNumber.trim(),
      title: data.title.trim(),
      documentClassification: docClassification,
      transactionType: txType,
      direction: data.direction || docClassification,
      documentType: data.documentType || txType,
      communicationType: data.communicationType || 'Internal Memo',
      reportType: data.reportType || 'N/A',
      originDepartment: data.originDepartment || 'General Records',
      dateReceived: data.dateReceived || now.toISOString().split('T')[0],
      timeReceived: data.timeReceived || now.toTimeString().split(' ')[0],
      targetDivision: data.targetDivision || 'Unassigned',
      responsiblePerson: resp.name,
      responsiblePersonId: resp.id,
      priority: data.priority || 'Routine',
      currentStatus: data.currentStatus || 'Incoming Logged',
      currentLocation: desk.name,
      currentCustodian: cust.name,
      currentCustodianId: cust.id,
      currentDeskId: desk.id,
      fileLink: data.fileLink || null,
      version: 1,
      isCleared: false,
      clearedBy: null,
      clearedAt: null,
      clearanceType: null,
      exitTrackingNumber: null,
      forwardedToExternal: null,
      clearanceRemarks: null,
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

export async function updateExistingDocument(id: string, data: any, clientVersion?: number | string, userId?: string, actor?: AuditActor) {
  return await withTransaction(async (tx) => {
    const existing = await tx.select().from(documents).where(eq(documents.id, id));
    if (existing.length === 0) {
      throw new DocumentNotFoundError(id);
    }

    const currentDoc = existing[0];

    const rawVer =
      clientVersion !== undefined && clientVersion !== null && !isNaN(Number(clientVersion))
        ? Number(clientVersion)
        : data?.expectedVersion !== undefined && data?.expectedVersion !== null
        ? Number(data.expectedVersion)
        : data?.baseVersion !== undefined && data?.baseVersion !== null
        ? Number(data.baseVersion)
        : data?.version !== undefined && data?.version !== null
        ? Number(data.version)
        : undefined;

    const expectedVer = rawVer !== undefined && !isNaN(rawVer) ? rawVer : undefined;

    // Optimistic Concurrency check
    if (expectedVer !== undefined && expectedVer !== currentDoc.version) {
      throw new DocumentConflictError(
        `Concurrency conflict: Document version is ${currentDoc.version}, but client expected ${expectedVer}.`
      );
    }

    // Terminal State Guard: Once Dispatched / Completed, changes require explicit administrative authority
    if (currentDoc.currentStatus === 'Dispatched / Completed') {
      const isPrivileged = actor?.role && ['System Admin', 'Department Manager'].includes(actor.role);
      if (!isPrivileged) {
        throw new DocumentValidationError(
          `Document ${currentDoc.trackingNumber} is Dispatched / Completed and archived. Terminal status entries cannot be modified.`
        );
      }
    }

    const now = new Date();
    const nextVersion = currentDoc.version + 1;

    // Validate and evaluate target lifecycle status
    let targetLifecycleStatus = currentDoc.currentStatus;
    if (data.currentStatus !== undefined && data.currentStatus !== currentDoc.currentStatus) {
      if (!isCanonicalLifecycleStatus(data.currentStatus)) {
        throw new DocumentValidationError(
          `Invalid status "${data.currentStatus}". Status must be one of the canonical POSSD lifecycle statuses: ${CANONICAL_LIFECYCLE_STATUSES.join(', ')}.`
        );
      }
      const val = await validateBackendLifecycleTransition(tx, id, currentDoc.currentStatus, data.currentStatus, actor);
      if (!val.valid) {
        throw new DocumentValidationError(val.reason || 'Invalid status transition.');
      }
      targetLifecycleStatus = data.currentStatus;
    }

    // Resolve relational references if updated
    const resp = (data.responsiblePersonId !== undefined || data.responsiblePerson !== undefined)
      ? await resolvePersonnelInfo(data.responsiblePersonId !== undefined ? (data.responsiblePersonId ? Number(data.responsiblePersonId) : null) : currentDoc.responsiblePersonId, data.responsiblePerson ?? currentDoc.responsiblePerson)
      : { id: currentDoc.responsiblePersonId, name: currentDoc.responsiblePerson, status: 'active', isFocalPerson: false };

    if (
      resp.status === 'suspended' &&
      data.responsiblePersonId !== undefined &&
      Number(data.responsiblePersonId) !== currentDoc.responsiblePersonId
    ) {
      throw new DocumentValidationError("Suspended personnel cannot be designated as Focal Person for documents.");
    }

    const cust = (data.currentCustodianId !== undefined || data.currentCustodian !== undefined)
      ? await resolvePersonnelInfo(data.currentCustodianId !== undefined ? (data.currentCustodianId ? Number(data.currentCustodianId) : null) : currentDoc.currentCustodianId, data.currentCustodian ?? currentDoc.currentCustodian)
      : { id: currentDoc.currentCustodianId, name: currentDoc.currentCustodian };

    const desk = (data.currentDeskId !== undefined || data.currentLocation !== undefined)
      ? await resolveDeskInfo(data.currentDeskId !== undefined ? (data.currentDeskId ? Number(data.currentDeskId) : null) : currentDoc.currentDeskId, data.currentLocation ?? currentDoc.currentLocation)
      : { id: currentDoc.currentDeskId, name: currentDoc.currentLocation };

    const updatedDocClassification = data.documentClassification !== undefined
      ? data.documentClassification
      : (data.direction !== undefined ? data.direction : currentDoc.documentClassification);

    const updatedTxType = data.transactionType !== undefined
      ? data.transactionType
      : (data.documentType !== undefined ? data.documentType : currentDoc.transactionType);

    const updateFields: any = {
      title: data.title ?? currentDoc.title,
      documentClassification: updatedDocClassification,
      transactionType: updatedTxType,
      direction: data.direction ?? updatedDocClassification,
      documentType: data.documentType ?? updatedTxType,
      communicationType: data.communicationType ?? currentDoc.communicationType,
      reportType: data.reportType ?? currentDoc.reportType,
      originDepartment: data.originDepartment ?? currentDoc.originDepartment,
      dateReceived: data.dateReceived ?? currentDoc.dateReceived,
      timeReceived: data.timeReceived ?? currentDoc.timeReceived,
      targetDivision: data.targetDivision ?? currentDoc.targetDivision,
      responsiblePerson: resp.name,
      responsiblePersonId: resp.id,
      priority: data.priority ?? currentDoc.priority,
      currentStatus: targetLifecycleStatus,
      currentLocation: desk.name,
      currentCustodian: cust.name,
      currentCustodianId: cust.id,
      currentDeskId: desk.id,
      fileLink: data.fileLink !== undefined ? data.fileLink : currentDoc.fileLink,
      version: nextVersion,
      updatedAt: now,
    };

    // Enforce atomic version check at SQL level inside transaction
    const [updated] = await tx
      .update(documents)
      .set(updateFields)
      .where(expectedVer !== undefined && !isNaN(expectedVer) ? and(eq(documents.id, id), eq(documents.version, expectedVer)) : eq(documents.id, id))
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

export async function deleteDocumentById(id: string, userId?: string, actor?: AuditActor, expectedVersion?: number) {
  return await withTransaction(async (tx) => {
    const existing = await tx.select().from(documents).where(eq(documents.id, id));
    if (existing.length === 0) {
      throw new DocumentNotFoundError(id);
    }

    const currentDoc = existing[0];
    const expectedVer = expectedVersion !== undefined && expectedVersion !== null ? Number(expectedVersion) : undefined;

    if (expectedVer !== undefined && !isNaN(expectedVer) && expectedVer !== currentDoc.version) {
      throw new DocumentConflictError(
        `Concurrency conflict: Document version is ${currentDoc.version}, but client expected ${expectedVer}. Delete aborted.`
      );
    }

    const deleted = await tx
      .delete(documents)
      .where(expectedVer !== undefined && !isNaN(expectedVer) ? and(eq(documents.id, id), eq(documents.version, expectedVer)) : eq(documents.id, id))
      .returning();

    if (deleted.length === 0) {
      throw new DocumentConflictError(`Concurrency conflict: Document version is no longer ${currentDoc.version}. Delete aborted.`);
    }

    await createAuditLog(
      {
        userId,
        actor,
        action: 'DELETE_DOCUMENT',
        entityType: 'document',
        entityId: id,
        oldValue: currentDoc,
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
    expectedVersion?: number;
    baseVersion?: number;
    version?: number;
  },
  userId?: string,
  actor?: AuditActor,
  expectedVersion?: number
) {
  return await withTransaction(async (tx) => {
    // 1. Fetch current document state
    const [doc] = await tx.select().from(documents).where(eq(documents.id, documentId));
    if (!doc) {
      throw new DocumentNotFoundError(documentId);
    }

    const rawVer = expectedVersion !== undefined && expectedVersion !== null
      ? expectedVersion
      : (movementData?.expectedVersion !== undefined && movementData?.expectedVersion !== null
        ? movementData.expectedVersion
        : (movementData?.baseVersion !== undefined && movementData?.baseVersion !== null
          ? movementData.baseVersion
          : (movementData?.version !== undefined && movementData?.version !== null
            ? movementData.version
            : undefined)));

    const expectedVer = rawVer !== undefined && rawVer !== null ? Number(rawVer) : undefined;

    if (expectedVer !== undefined && !isNaN(expectedVer) && expectedVer !== doc.version) {
      throw new DocumentConflictError(
        `Concurrency conflict: Document version is ${doc.version}, but client expected ${expectedVer}. Routing aborted.`
      );
    }

    // Terminal State Guard
    if (doc.currentStatus === 'Dispatched / Completed') {
      const isPrivileged = actor?.role && ['System Admin', 'Department Manager'].includes(actor.role);
      if (!isPrivileged) {
        throw new DocumentValidationError(
          `Document ${doc.trackingNumber} is Dispatched / Completed and archived. Routing completed entries is not permitted.`
        );
      }
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

    // Determine target lifecycle status vs movement description text
    let targetDocStatus = doc.currentStatus;
    const movementStatusText = movementData.statusUpdate || doc.currentStatus;

    if (movementData.statusUpdate && isCanonicalLifecycleStatus(movementData.statusUpdate)) {
      const val = await validateBackendLifecycleTransition(tx, documentId, doc.currentStatus, movementData.statusUpdate, actor);
      if (!val.valid) {
        throw new DocumentValidationError(val.reason || 'Invalid status transition.');
      }
      targetDocStatus = movementData.statusUpdate;
    } else {
      // Movement description text (e.g. "Forwarded for Legal Review") does NOT overwrite canonical currentStatus!
      if (doc.currentStatus === 'Incoming Logged') {
        targetDocStatus = 'Under Review';
      }
    }

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
        statusUpdate: movementStatusText,
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
        currentStatus: targetDocStatus,
        currentDeskId: targetDesk.id,
        currentCustodianId: targetCust.id,
        version: doc.version + 1,
        updatedAt: now,
      })
      .where(expectedVer !== undefined && !isNaN(expectedVer) ? and(eq(documents.id, documentId), eq(documents.version, expectedVer)) : eq(documents.id, documentId))
      .returning();

    if (!updatedDoc) {
      throw new DocumentConflictError(`Concurrency conflict: Document version is no longer ${doc.version}. Routing aborted.`);
    }

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
    expectedVersion?: number;
    baseVersion?: number;
    version?: number;
  },
  userId?: string,
  actor?: AuditActor,
  expectedVersion?: number
) {
  return await withTransaction(async (tx) => {
    const [doc] = await tx.select().from(documents).where(eq(documents.id, documentId));
    if (!doc) {
      throw new DocumentNotFoundError(documentId);
    }

    const rawVer = expectedVersion !== undefined && expectedVersion !== null
      ? expectedVersion
      : (remarkData?.expectedVersion !== undefined && remarkData?.expectedVersion !== null
        ? remarkData.expectedVersion
        : (remarkData?.baseVersion !== undefined && remarkData?.baseVersion !== null
          ? remarkData.baseVersion
          : (remarkData?.version !== undefined && remarkData?.version !== null
            ? remarkData.version
            : undefined)));

    const expectedVer = rawVer !== undefined && rawVer !== null ? Number(rawVer) : undefined;

    if (expectedVer !== undefined && !isNaN(expectedVer) && expectedVer !== doc.version) {
      throw new DocumentConflictError(
        `Concurrency conflict: Document version is ${doc.version}, but client expected ${expectedVer}. Remark aborted.`
      );
    }

    if (doc.currentStatus === 'Dispatched / Completed') {
      const isPrivileged = actor?.role && ['System Admin', 'Department Manager'].includes(actor.role);
      if (!isPrivileged) {
        throw new DocumentValidationError(
          `Document ${doc.trackingNumber} is Dispatched / Completed and archived. Cannot add directives to completed documents.`
        );
      }
    }

    const remarkId = `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

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

    // If compliance is required, transition lifecycle status to 'Supervisor Comment Needed'
    if (remarkData.complianceRequired) {
      const [updatedDoc] = await tx
        .update(documents)
        .set({
          currentStatus: 'Supervisor Comment Needed',
          version: doc.version + 1,
          updatedAt: now,
        })
        .where(expectedVer !== undefined && !isNaN(expectedVer) ? and(eq(documents.id, documentId), eq(documents.version, expectedVer)) : eq(documents.id, documentId))
        .returning();

      if (!updatedDoc) {
        throw new DocumentConflictError(`Concurrency conflict: Document version is no longer ${doc.version}. Remark aborted.`);
      }
    }

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

export async function fulfillDocumentCompliance(
  documentId: string,
  remarkId: string,
  complianceNotes: string,
  userId?: string,
  actor?: AuditActor,
  expectedVersion?: number
) {
  return await withTransaction(async (tx) => {
    const [doc] = await tx.select().from(documents).where(eq(documents.id, documentId));
    if (!doc) {
      throw new DocumentNotFoundError(documentId);
    }

    const expectedVer = expectedVersion !== undefined && expectedVersion !== null ? Number(expectedVersion) : undefined;

    if (expectedVer !== undefined && !isNaN(expectedVer) && expectedVer !== doc.version) {
      throw new DocumentConflictError(
        `Concurrency conflict: Document version is ${doc.version}, but client expected ${expectedVer}. Compliance fulfillment aborted.`
      );
    }

    if (doc.currentStatus === 'Dispatched / Completed') {
      throw new DocumentValidationError(`Document ${doc.trackingNumber} is Dispatched / Completed and archived.`);
    }

    const [remark] = await tx.select().from(documentRemarks).where(eq(documentRemarks.id, remarkId));
    if (!remark) {
      throw new DocumentValidationError(`Supervisor remark with ID "${remarkId}" not found.`);
    }

    const now = new Date();
    const actorName = actor?.name || 'Staff';

    const [updatedRemark] = await tx
      .update(documentRemarks)
      .set({
        complied: true,
        compliedAt: now,
        compliedBy: actorName,
        complianceNotes: complianceNotes || remark.complianceNotes || null,
      })
      .where(eq(documentRemarks.id, remarkId))
      .returning();

    // Check if any uncomplied mandatory remarks remain
    const uncomplied = await tx
      .select()
      .from(documentRemarks)
      .where(and(
        eq(documentRemarks.documentId, documentId),
        eq(documentRemarks.complianceRequired, true),
        eq(documentRemarks.complied, false)
      ));

    let updatedDoc = doc;
    if (uncomplied.length === 0 && doc.currentStatus === 'Supervisor Comment Needed') {
      const [u] = await tx
        .update(documents)
        .set({
          currentStatus: 'Complied / Ready for Clearance',
          version: doc.version + 1,
          updatedAt: now,
        })
        .where(expectedVer !== undefined && !isNaN(expectedVer) ? and(eq(documents.id, documentId), eq(documents.version, expectedVer)) : eq(documents.id, documentId))
        .returning();

      if (!u) {
        throw new DocumentConflictError(`Concurrency conflict: Document version is no longer ${doc.version}. Compliance fulfillment aborted.`);
      }
      updatedDoc = u;
    }

    await createAuditLog(
      {
        userId,
        actor,
        action: 'FULFILL_COMPLIANCE',
        entityType: 'document',
        entityId: documentId,
        oldValue: { remarkId, complied: remark.complied },
        newValue: { remarkId, complied: true, docStatus: updatedDoc.currentStatus },
      },
      tx
    );

    return { remark: updatedRemark, document: updatedDoc };
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
    expectedVersion?: number;
    baseVersion?: number;
    version?: number;
  },
  userId?: string,
  actor?: AuditActor,
  expectedVersion?: number
) {
  return await withTransaction(async (tx) => {
    const [doc] = await tx.select().from(documents).where(eq(documents.id, documentId));
    if (!doc) {
      throw new DocumentNotFoundError(documentId);
    }

    const rawVer = expectedVersion !== undefined && expectedVersion !== null
      ? expectedVersion
      : (clearanceData?.expectedVersion !== undefined && clearanceData?.expectedVersion !== null
        ? clearanceData.expectedVersion
        : (clearanceData?.baseVersion !== undefined && clearanceData?.baseVersion !== null
          ? clearanceData.baseVersion
          : (clearanceData?.version !== undefined && clearanceData?.version !== null
            ? clearanceData.version
            : undefined)));

    const expectedVer = rawVer !== undefined && rawVer !== null ? Number(rawVer) : undefined;

    if (expectedVer !== undefined && !isNaN(expectedVer) && expectedVer !== doc.version) {
      throw new DocumentConflictError(
        `Concurrency conflict: Document version is ${doc.version}, but client expected ${expectedVer}. Clearance aborted.`
      );
    }

    if (doc.currentStatus === 'Dispatched / Completed') {
      const isPrivileged = actor?.role && ['System Admin', 'Department Manager'].includes(actor.role);
      if (!isPrivileged) {
        throw new DocumentValidationError(
          `Document ${doc.trackingNumber} is Dispatched / Completed and archived. Modifications to completed entries are restricted.`
        );
      }
    }

    const now = new Date();
    const isCleared = clearanceData.isCleared !== undefined ? Boolean(clearanceData.isCleared) : true;

    // Check for unresolved compliance remarks if clearing
    if (isCleared) {
      const unresolvedRemarks = await tx
        .select()
        .from(documentRemarks)
        .where(and(
          eq(documentRemarks.documentId, documentId),
          eq(documentRemarks.complianceRequired, true),
          eq(documentRemarks.complied, false)
        ));

      if (unresolvedRemarks.length > 0) {
        throw new DocumentValidationError("Cannot clear document: there are unresolved compliance remarks.");
      }
    }

    // Resolve authoritative actor
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

    // 1. Upsert manager_clearances
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
      const unresolved = await tx
        .select()
        .from(documentRemarks)
        .where(and(
          eq(documentRemarks.documentId, documentId),
          eq(documentRemarks.complianceRequired, true),
          eq(documentRemarks.complied, false)
        ));
      nextStatus = unresolved.length > 0 ? 'Supervisor Comment Needed' : 'Under Review';
    }

    if (clearanceData.currentStatus) {
      if (!isCanonicalLifecycleStatus(clearanceData.currentStatus)) {
        throw new DocumentValidationError(`Invalid status "${clearanceData.currentStatus}".`);
      }
      const val = await validateBackendLifecycleTransition(tx, documentId, doc.currentStatus, clearanceData.currentStatus, actor);
      if (!val.valid) {
        throw new DocumentValidationError(val.reason || 'Invalid status transition.');
      }
      nextStatus = clearanceData.currentStatus;
    }

    // 2. Synchronize legacy columns on documents table
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
      .where(expectedVer !== undefined && !isNaN(expectedVer) ? and(eq(documents.id, documentId), eq(documents.version, expectedVer)) : eq(documents.id, documentId))
      .returning();

    if (!updatedDoc) {
      throw new DocumentConflictError(`Concurrency conflict: Document version is no longer ${doc.version}. Clearance aborted.`);
    }

    // 3. Log audit event
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
    expectedVersion?: number;
    baseVersion?: number;
    version?: number;
  } = {},
  userId?: string,
  actor?: AuditActor,
  expectedVersion?: number
) {
  const rawVer = expectedVersion !== undefined && expectedVersion !== null
    ? expectedVersion
    : (revokeData?.expectedVersion !== undefined && revokeData?.expectedVersion !== null
      ? revokeData.expectedVersion
      : (revokeData?.baseVersion !== undefined && revokeData?.baseVersion !== null
        ? revokeData.baseVersion
        : (revokeData?.version !== undefined && revokeData?.version !== null
          ? revokeData.version
          : undefined)));

  const expectedVer = rawVer !== undefined && rawVer !== null ? Number(rawVer) : undefined;

  return await addDocumentClearance(
    documentId,
    {
      isCleared: false,
      clearanceType: 'returned_for_revision',
      clearanceRemarks: revokeData.reason || 'Clearance revoked / returned for revision.',
      currentStatus: revokeData.returnStatus || 'Under Review',
      expectedVersion: expectedVer,
    },
    userId,
    actor,
    expectedVer
  );
}


