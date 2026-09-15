/**
 * POSSD Office Document Tracker - Audit Engine
 * 
 * Provides an authoritative, append-only audit logging architecture.
 * Implements duplicate suppression, idempotency checks, and full lifecycle
 * event compilation for compliance and transmittal reporting.
 */

import {
  DocumentItem,
  AuditEventRecord,
  AuditActionType,
  AuditEventStateSnapshot,
  parsePhilippineDateToISO,
} from '../types';
import { generateEntityId } from './workflow';
import { safeStorageGet, safeStorageSet } from '../mockData';

const AUDIT_STORAGE_KEY = 'possd_audit_trail_v1';
const IDEMPOTENCY_WINDOW_MS = 3000; // 3-second deduplication window for identical rapid events

// In-memory cache for fast lookup and duplicate prevention
let memoryAuditLog: AuditEventRecord[] = [];

// Initialize memory log from local storage
try {
  const stored = safeStorageGet(AUDIT_STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      memoryAuditLog = parsed;
    }
  }
} catch {
  memoryAuditLog = [];
}

/**
 * Generates an idempotency key based on core event attributes.
 */
export function generateIdempotencyKey(
  documentId: string,
  action: AuditActionType,
  actorName: string,
  extraMarker?: string
): string {
  const normalizedDoc = (documentId || '').trim();
  const normalizedAction = (action || '').trim();
  const normalizedActor = (actorName || '').trim().toLowerCase();
  const normalizedExtra = (extraMarker || '').trim();
  return `${normalizedDoc}:${normalizedAction}:${normalizedActor}:${normalizedExtra}`;
}

/**
 * Checks whether an incoming audit event is a duplicate of an existing event within the suppression window.
 */
export function isDuplicateAuditEvent(
  newEvent: AuditEventRecord,
  existingEvents: AuditEventRecord[] = memoryAuditLog,
  windowMs: number = IDEMPOTENCY_WINDOW_MS
): boolean {
  if (!newEvent || !existingEvents || existingEvents.length === 0) {
    return false;
  }

  const newTime = new Date(newEvent.timestamp).getTime();

  return existingEvents.some((existing) => {
    // 1. Exact Idempotency Key Match
    if (
      newEvent.idempotencyKey &&
      existing.idempotencyKey &&
      newEvent.idempotencyKey === existing.idempotencyKey
    ) {
      const existingTime = new Date(existing.timestamp).getTime();
      if (Math.abs(newTime - existingTime) <= windowMs) {
        return true;
      }
    }

    // 2. Structural Match within Time Window
    if (
      existing.documentId === newEvent.documentId &&
      existing.action === newEvent.action &&
      existing.actorName.toLowerCase() === newEvent.actorName.toLowerCase() &&
      existing.statusUpdate === newEvent.statusUpdate &&
      existing.fromDesk === newEvent.fromDesk &&
      existing.toDesk === newEvent.toDesk
    ) {
      const existingTime = new Date(existing.timestamp).getTime();
      if (Math.abs(newTime - existingTime) <= windowMs) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Creates a standardized AuditEventRecord.
 */
export function createAuditEvent(params: {
  documentId: string;
  trackingNumber: string;
  action: AuditActionType;
  actionTitle: string;
  stageLabel: string;
  type: AuditEventRecord['type'];
  actor: {
    id?: string;
    name: string;
    role: string;
    division?: string;
  };
  fromDesk?: string;
  toDesk?: string;
  statusUpdate?: string;
  notes?: string;
  previousState?: AuditEventStateSnapshot;
  newState?: AuditEventStateSnapshot;
  complianceRequired?: boolean;
  complied?: boolean;
  clearanceType?: string;
  exitTrackingNumber?: string;
  forwardedToExternal?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
  idempotencyKey?: string;
}): AuditEventRecord {
  const timestamp = params.timestamp || new Date().toISOString();
  const idempotencyKey =
    params.idempotencyKey ||
    generateIdempotencyKey(
      params.documentId,
      params.action,
      params.actor.name,
      params.statusUpdate || params.fromDesk || ''
    );

  return {
    id: generateEntityId('aud'),
    documentId: params.documentId,
    trackingNumber: params.trackingNumber,
    timestamp,
    actorId: params.actor.id,
    actorName: params.actor.name,
    actorRole: params.actor.role,
    actorDivision: params.actor.division,
    action: params.action,
    actionTitle: params.actionTitle,
    stageLabel: params.stageLabel,
    type: params.type,
    fromDesk: params.fromDesk,
    toDesk: params.toDesk,
    statusUpdate: params.statusUpdate,
    notes: params.notes,
    previousState: params.previousState,
    newState: params.newState,
    complianceRequired: params.complianceRequired,
    complied: params.complied,
    clearanceType: params.clearanceType,
    exitTrackingNumber: params.exitTrackingNumber,
    forwardedToExternal: params.forwardedToExternal,
    metadata: params.metadata,
    idempotencyKey,
  };
}

/**
 * Records an audit event into the append-only repository.
 * Returns true if the event was appended, or false if suppressed as a duplicate.
 */
export function recordGlobalAudit(event: AuditEventRecord): boolean {
  if (isDuplicateAuditEvent(event, memoryAuditLog)) {
    return false;
  }

  // Append-only: newest added to array
  memoryAuditLog = [...memoryAuditLog, Object.freeze({ ...event })];

  // Limit local cache to last 500 records to prevent memory bloat in single-page mode
  if (memoryAuditLog.length > 500) {
    memoryAuditLog = memoryAuditLog.slice(-500);
  }

  try {
    safeStorageSet(AUDIT_STORAGE_KEY, JSON.stringify(memoryAuditLog));
  } catch (err) {
    console.warn('[Audit] Failed to persist audit log to storage:', err);
  }

  return true;
}

/**
 * Retrieves audit logs from the global repository with optional filtering.
 */
export function getGlobalAuditLogs(filter?: {
  documentId?: string;
  trackingNumber?: string;
  action?: AuditActionType;
  actorName?: string;
  limit?: number;
}): AuditEventRecord[] {
  let results = [...memoryAuditLog];

  if (filter?.documentId) {
    results = results.filter((e) => e.documentId === filter.documentId);
  }
  if (filter?.trackingNumber) {
    results = results.filter((e) => e.trackingNumber === filter.trackingNumber);
  }
  if (filter?.action) {
    results = results.filter((e) => e.action === filter.action);
  }
  if (filter?.actorName) {
    const actorLower = filter.actorName.toLowerCase();
    results = results.filter((e) => e.actorName.toLowerCase().includes(actorLower));
  }

  // Sort descending (newest first) by default
  results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (filter?.limit && filter.limit > 0) {
    results = results.slice(0, filter.limit);
  }

  return results;
}

/**
 * Compiles a document's full lifecycle events into an authoritative, chronological list of AuditEventRecords.
 * Combines inflow creation, desk movements, supervisory directives & compliance, and manager clearance.
 */
export function compileDocumentAuditTrail(
  document: DocumentItem,
  sortOrder: 'asc' | 'desc' = 'asc'
): AuditEventRecord[] {
  if (!document) return [];

  const events: AuditEventRecord[] = [];
  const seenIds = new Set<string>();

  // 1. Initial Inflow / Receipt Event
  const inflowTime =
    document.createdAt ||
    parsePhilippineDateToISO(document.dateReceived, document.timeReceived) ||
    new Date().toISOString();

  const inflowEvent: AuditEventRecord = {
    id: `aud-${document.id || document.trackingNumber}-inflow`,
    documentId: document.id,
    trackingNumber: document.trackingNumber,
    timestamp: inflowTime,
    actorName: document.responsiblePerson || 'Records Custodian',
    actorRole: 'Receiving Staff / Inflow Officer',
    actorDivision: document.targetDivision,
    action: 'DOCUMENT_CREATED',
    actionTitle: 'Incoming Document Logged & Registered',
    stageLabel: 'Stage 1: Inflow',
    type: 'inflow',
    fromDesk: document.originDepartment,
    toDesk: document.currentLocation || document.targetDivision,
    statusUpdate: 'Incoming Logged',
    notes: `Document classified as "${document.documentType}" (${document.communicationType} • ${document.reportType}) with ${document.priority} Priority from origin "${document.originDepartment}". Designated target division: ${document.targetDivision}.`,
    newState: {
      status: document.currentStatus,
      location: document.currentLocation,
      custodian: document.currentCustodian,
      priority: document.priority,
      direction: document.direction,
    },
    idempotencyKey: generateIdempotencyKey(document.id, 'DOCUMENT_CREATED', document.responsiblePerson || 'Receiving'),
  };

  events.push(inflowEvent);
  seenIds.add(inflowEvent.id);

  // 2. All Internal Desk Movements
  (document.movements || []).forEach((m, idx) => {
    const movId = m.id ? `aud-mov-${m.id}` : `aud-mov-${idx}-${m.timestamp}`;
    if (seenIds.has(movId)) return;
    seenIds.add(movId);

    const isFirstMovement = idx === 0 && document.movements.length === 1;
    const actionTitle = m.statusUpdate === 'dispatched'
      ? `Dispatched: ${m.currentDesk} ➔ ${m.forwardToDesk}`
      : `Transferred: ${m.currentDesk} ➔ ${m.forwardToDesk}`;

    events.push({
      id: movId,
      documentId: document.id,
      trackingNumber: document.trackingNumber,
      timestamp: m.timestamp,
      actorName: m.personnelName,
      actorRole: m.personnelRole || 'Handling Staff',
      action: m.statusUpdate === 'dispatched' ? 'DISPATCHED_COMPLETED' : 'MOVEMENT_RECORDED',
      actionTitle,
      stageLabel: m.statusUpdate === 'dispatched' ? 'Terminal Clearance' : 'Internal Routing',
      type: 'movement',
      fromDesk: m.currentDesk,
      toDesk: m.forwardToDesk,
      statusUpdate: m.statusUpdate,
      notes: m.notes,
      idempotencyKey: generateIdempotencyKey(document.id, 'MOVEMENT_RECORDED', m.personnelName, m.forwardToDesk),
    });
  });

  // 3. Supervisor Directives and Compliances
  (document.supervisorRemarks || []).forEach((r, idx) => {
    // 3A. Directive Issuance
    const dirId = `aud-rem-dir-${r.id || idx}`;
    if (!seenIds.has(dirId)) {
      seenIds.add(dirId);
      events.push({
        id: dirId,
        documentId: document.id,
        trackingNumber: document.trackingNumber,
        timestamp: r.timestamp,
        actorName: r.supervisorName,
        actorRole: 'Supervisor / Division Head',
        action: 'DIRECTIVE_ISSUED',
        actionTitle: 'Supervisor Directive Issued',
        stageLabel: 'Supervisory Action',
        type: 'remark',
        statusUpdate: r.complianceRequired ? 'Compliance Required' : 'Informational Remark',
        notes: r.remarkText,
        complianceRequired: r.complianceRequired,
        complied: r.complied,
        idempotencyKey: generateIdempotencyKey(document.id, 'DIRECTIVE_ISSUED', r.supervisorName, r.id),
      });
    }

    // 3B. Directive Compliance Fulfilled
    if (r.complied) {
      const compId = `aud-rem-comp-${r.id || idx}`;
      if (!seenIds.has(compId)) {
        seenIds.add(compId);
        events.push({
          id: compId,
          documentId: document.id,
          trackingNumber: document.trackingNumber,
          timestamp: r.compliedAt || r.timestamp,
          actorName: r.compliedBy || 'Action Staff',
          actorRole: 'Staff / Action Officer',
          action: 'COMPLIANCE_FULFILLED',
          actionTitle: 'Supervisor Directive Complied & Verified',
          stageLabel: 'Compliance Fulfilled',
          type: 'compliance',
          statusUpdate: 'Directive Complied',
          notes: r.complianceNotes || 'Action fulfilled according to supervisor instructions.',
          complied: true,
          idempotencyKey: generateIdempotencyKey(document.id, 'COMPLIANCE_FULFILLED', r.compliedBy || 'Staff', r.id),
        });
      }
    }
  });

  // 4. Manager Clearance / Outgoing Dispatch
  if (document.managerClearance?.isCleared) {
    const clearance = document.managerClearance;
    const clearanceLabel =
      clearance.clearanceType === 'approved_for_dispatch'
        ? 'Approved for Outgoing Dispatch'
        : clearance.clearanceType === 'archived_completed'
        ? 'Completed & Archived'
        : 'Returned for Revision';

    const clrId = `aud-clearance-${document.id}`;
    if (!seenIds.has(clrId)) {
      seenIds.add(clrId);
      events.push({
        id: clrId,
        documentId: document.id,
        trackingNumber: document.trackingNumber,
        timestamp: clearance.clearedAt || document.updatedAt || new Date().toISOString(),
        actorName: clearance.clearedBy || 'Division Manager',
        actorRole: 'Department Manager / Authorizing Official',
        action: 'CLEARANCE_GRANTED',
        actionTitle: `Manager Clearance: ${clearanceLabel}`,
        stageLabel: 'Terminal Clearance',
        type: 'clearance',
        fromDesk: document.currentLocation,
        toDesk: clearance.forwardedToExternal || 'External Recipient',
        statusUpdate: 'Cleared for Out',
        clearanceType: clearance.clearanceType,
        exitTrackingNumber: clearance.exitTrackingNumber,
        forwardedToExternal: clearance.forwardedToExternal,
        notes: clearance.clearanceRemarks || 'Final clearance granted for outgoing transmittal.',
        idempotencyKey: generateIdempotencyKey(document.id, 'CLEARANCE_GRANTED', clearance.clearedBy || 'Manager'),
      });
    }
  }

  // Sort chronologically
  return events.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
  });
}

/**
 * Clears the in-memory and stored audit log (used in testing).
 */
export function resetAuditLogForTesting(): void {
  memoryAuditLog = [];
  try {
    safeStorageSet(AUDIT_STORAGE_KEY, JSON.stringify([]));
  } catch {
    // Ignore in tests
  }
}
