import {
  DocumentItem,
  InternalMovement,
  SupervisorRemark,
  ManagerClearance,
  getSortedMovements,
  normalizeDocumentItem,
} from '../types';
import { getRolePermissions, normalizeRole } from './permissions';

/**
 * The 6 Authoritative POSSD Document Lifecycle Statuses
 */
export type DocumentStatus =
  | 'Incoming Logged'
  | 'Assigned'
  | 'Under Review'
  | 'Supervisor Comment Needed'
  | 'Complied / Ready for Clearance'
  | 'Cleared for Out'
  | 'Dispatched / Completed';

export const ALL_DOCUMENT_STATUSES: readonly DocumentStatus[] = [
  'Incoming Logged',
  'Assigned',
  'Under Review',
  'Supervisor Comment Needed',
  'Complied / Ready for Clearance',
  'Cleared for Out',
  'Dispatched / Completed',
] as const;

/**
 * Standard Workflow Actor representation
 */
export interface WorkflowActor {
  id?: string;
  name: string;
  role?: string;
  division?: string;
}

export interface WorkflowResult<T = DocumentItem> {
  success: boolean;
  document: T;
  movement?: InternalMovement;
  notificationMessage?: string;
  error?: string;
}

export interface BatchWorkflowResult {
  totalProcessed: number;
  succeeded: number;
  failed: number;
  updatedDocuments: DocumentItem[];
  errors: Array<{
    documentId: string;
    trackingNumber: string;
    reason: string;
  }>;
}

/**
 * Generates unique, stable, non-array-dependent IDs suitable for database migration.
 */
export function generateEntityId(
  prefix: 'doc' | 'mov' | 'rem' | 'notif' | 'link' | 'audit' | 'aud' | 'staff'
): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${timestamp}-${randomPart}`;
}

/**
 * Checks if the document has any mandatory supervisor directives that remain uncomplied.
 */
export function hasUncompliedSupervisorRemarks(doc: DocumentItem): boolean {
  if (!doc.supervisorRemarks || !Array.isArray(doc.supervisorRemarks)) {
    return false;
  }
  return doc.supervisorRemarks.some((r) => r.complianceRequired && !r.complied);
}

/**
 * Validates whether a proposed status transition is permitted by business rules.
 */
export function validateStatusTransition(
  doc: DocumentItem,
  targetStatus: DocumentStatus,
  actor?: WorkflowActor
): { valid: boolean; reason?: string } {
  if (doc.currentStatus === targetStatus) {
    return { valid: true };
  }

  // Terminal State Guard: Once Dispatched / Completed, changes require explicit administrative re-opening
  if (doc.currentStatus === 'Dispatched / Completed') {
    const isPrivileged = actor?.role && ['System Admin', 'Department Manager'].includes(normalizeRole(actor.role) || '');
    if (!isPrivileged) {
      return {
        valid: false,
        reason: `Document ${doc.trackingNumber} is already Dispatched / Completed and archived. Only Department Managers or System Admins can modify completed entries.`,
      };
    }
  }

  // Rule: Cannot transition to "Cleared for Out" or "Dispatched / Completed" if mandatory supervisor remarks are uncomplied
  if (
    (targetStatus === 'Cleared for Out' || targetStatus === 'Dispatched / Completed') &&
    hasUncompliedSupervisorRemarks(doc)
  ) {
    return {
      valid: false,
      reason: `Cannot clear or complete ${doc.trackingNumber}: Uncomplied supervisor directives remain outstanding.`,
    };
  }

  // Rule: Cannot transition to "Complied / Ready for Clearance" if any mandatory supervisor remark is uncomplied
  if (targetStatus === 'Complied / Ready for Clearance' && hasUncompliedSupervisorRemarks(doc)) {
    return {
      valid: false,
      reason: `Cannot mark ${doc.trackingNumber} as Complied: One or more supervisor directives are not yet fulfilled.`,
    };
  }

  // Rule: Cannot transition directly to "Cleared for Out" without manager clearance
  if (targetStatus === 'Cleared for Out' && !doc.managerClearance?.isCleared) {
    return {
      valid: false,
      reason: `Cannot transition ${doc.trackingNumber} to "Cleared for Out" without authorized Manager Clearance.`,
    };
  }

  return { valid: true };
}

/**
 * Helper to produce a standardized InternalMovement entry and update timestamps/version.
 */
function createMovementRecord(
  doc: DocumentItem,
  params: {
    actor: WorkflowActor;
    fromDesk: string;
    toDesk: string;
    statusUpdate: InternalMovement['statusUpdate'];
    notes?: string;
    timestamp?: string;
  }
): { movement: InternalMovement; nowIso: string } {
  const nowIso = params.timestamp || new Date().toISOString();
  const movement: InternalMovement = {
    id: generateEntityId('mov'),
    timestamp: nowIso,
    personnelName: params.actor.name || 'System Custodian',
    personnelRole: params.actor.role || 'Staff',
    currentDesk: params.fromDesk || doc.currentLocation || 'Receiving Desk',
    forwardToDesk: params.toDesk || doc.currentLocation || 'Receiving Desk',
    statusUpdate: params.statusUpdate,
    notes: params.notes || '',
  };
  return { movement, nowIso };
}

/**
 * Reconciles document integrity: ensures impossible states are corrected safely,
 * movements are chronologically sorted, IDs exist, and flags are consistent.
 */
export function reconcileDocumentIntegrity(rawDoc: any): DocumentItem {
  const doc = normalizeDocumentItem(rawDoc);
  const nowIso = new Date().toISOString();

  // Ensure ID is stable and non-empty
  if (!doc.id || doc.id === 'undefined') {
    doc.id = generateEntityId('doc');
  }

  // Fix inconsistent direction
  const isClearedOrDispatched =
    doc.currentStatus === 'Cleared for Out' ||
    doc.currentStatus === 'Dispatched / Completed' ||
    !!doc.managerClearance?.isCleared;

  if (isClearedOrDispatched && doc.direction !== 'Outgoing') {
    doc.direction = 'Outgoing';
  }

  // If status is Dispatched / Completed, ensure location and custodian reflect dispatch
  if (doc.currentStatus === 'Dispatched / Completed') {
    if (!doc.currentLocation || doc.currentLocation === 'Receiving Station') {
      doc.currentLocation = 'Dispatch / External Archive';
    }
  }

  // If status is Supervisor Comment Needed, ensure there is at least one remark
  if (doc.currentStatus === 'Supervisor Comment Needed' && !hasUncompliedSupervisorRemarks(doc)) {
    doc.currentStatus = 'Complied / Ready for Clearance';
  }

  // Ensure all movements have unique IDs and timestamps
  if (doc.movements && Array.isArray(doc.movements)) {
    doc.movements = doc.movements.map((m, idx) => ({
      ...m,
      id: m.id && m.id !== 'undefined' ? m.id : `mov-${idx}-${nowIso}`,
      timestamp: m.timestamp || nowIso,
      statusUpdate: m.statusUpdate || 'in_review',
    }));
  }

  // Ensure all supervisor remarks have unique IDs and timestamps
  if (doc.supervisorRemarks && Array.isArray(doc.supervisorRemarks)) {
    doc.supervisorRemarks = doc.supervisorRemarks.map((r, idx) => ({
      ...r,
      id: r.id && r.id !== 'undefined' ? r.id : `rem-${idx}-${nowIso}`,
      timestamp: r.timestamp || nowIso,
      complied: !!r.complied,
      complianceRequired: !!r.complianceRequired,
    }));
  }

  // Version counter safety
  if (typeof doc.version !== 'number' || isNaN(doc.version) || doc.version < 1) {
    doc.version = 1;
  }

  return doc;
}

/**
 * Records an internal desk movement for a document.
 */
export function recordDocumentMovement(
  doc: DocumentItem,
  params: {
    fromDesk: string;
    toDesk: string;
    statusUpdate?: InternalMovement['statusUpdate'];
    notes?: string;
  },
  actor: WorkflowActor
): WorkflowResult {
  const cleanDoc = reconcileDocumentIntegrity(doc);

  if (cleanDoc.currentStatus === 'Dispatched / Completed') {
    return {
      success: false,
      document: cleanDoc,
      error: `Cannot route document ${cleanDoc.trackingNumber}: Document is already completed and archived.`,
    };
  }

  const fromDesk = params.fromDesk.trim() || cleanDoc.currentLocation || 'Receiving Desk';
  const toDesk = params.toDesk.trim();

  if (!toDesk) {
    return {
      success: false,
      document: cleanDoc,
      error: 'Destination desk is required for movement.',
    };
  }

  // Determine next status
  let nextStatus = cleanDoc.currentStatus;
  if (cleanDoc.currentStatus === 'Incoming Logged') {
    nextStatus = 'Assigned';
  }

  const { movement, nowIso } = createMovementRecord(cleanDoc, {
    actor,
    fromDesk,
    toDesk,
    statusUpdate: params.statusUpdate || 'forwarded',
    notes: params.notes?.trim() || `Routed from ${fromDesk} to ${toDesk}`,
  });

  const updatedDoc: DocumentItem = {
    ...cleanDoc,
    currentLocation: toDesk,
    currentCustodian: actor.name || cleanDoc.currentCustodian,
    currentStatus: nextStatus,
    movements: [movement, ...(cleanDoc.movements || [])],
    version: (cleanDoc.version || 1) + 1,
    updatedAt: nowIso,
  };

  const notificationMessage = `Document ${cleanDoc.trackingNumber} transferred to "${toDesk}" by ${actor.name}`;

  return {
    success: true,
    document: updatedDoc,
    movement,
    notificationMessage,
  };
}

/**
 * Adds a supervisor remark/directive to the document.
 */
export function addSupervisorRemark(
  doc: DocumentItem,
  params: {
    remarkText: string;
    complianceRequired: boolean;
  },
  actor: WorkflowActor
): WorkflowResult {
  const cleanDoc = reconcileDocumentIntegrity(doc);

  if (cleanDoc.currentStatus === 'Dispatched / Completed') {
    return {
      success: false,
      document: cleanDoc,
      error: `Cannot add directive to ${cleanDoc.trackingNumber}: Document is already completed.`,
    };
  }

  const remarkText = params.remarkText.trim();
  if (!remarkText) {
    return {
      success: false,
      document: cleanDoc,
      error: 'Remark text cannot be empty.',
    };
  }

  const nowIso = new Date().toISOString();
  const newRemark: SupervisorRemark = {
    id: generateEntityId('rem'),
    supervisorName: actor.name || 'Supervisor',
    timestamp: nowIso,
    remarkText,
    complianceRequired: params.complianceRequired,
    complied: false,
  };

  // Status moves to "Supervisor Comment Needed" if compliance is required
  const nextStatus = params.complianceRequired ? 'Supervisor Comment Needed' : cleanDoc.currentStatus;

  // Record an audit movement for the supervisor action
  const { movement } = createMovementRecord(cleanDoc, {
    actor,
    fromDesk: cleanDoc.currentLocation,
    toDesk: cleanDoc.currentLocation,
    statusUpdate: 'in_review',
    notes: `Supervisor Remark added: "${remarkText.slice(0, 60)}${remarkText.length > 60 ? '...' : ''}" (${
      params.complianceRequired ? 'Compliance Required' : 'Informational'
    })`,
    timestamp: nowIso,
  });

  const updatedDoc: DocumentItem = {
    ...cleanDoc,
    currentStatus: nextStatus,
    supervisorRemarks: [newRemark, ...(cleanDoc.supervisorRemarks || [])],
    movements: [movement, ...(cleanDoc.movements || [])],
    version: (cleanDoc.version || 1) + 1,
    updatedAt: nowIso,
  };

  const notificationMessage = `Supervisor directive added by ${actor.name} on ${cleanDoc.trackingNumber}`;

  return {
    success: true,
    document: updatedDoc,
    movement,
    notificationMessage,
  };
}

/**
 * Marks a specific supervisor remark as complied.
 */
export function fulfillSupervisorCompliance(
  doc: DocumentItem,
  remarkId: string,
  complianceNotes: string,
  actor: WorkflowActor
): WorkflowResult {
  const cleanDoc = reconcileDocumentIntegrity(doc);

  const targetRemark = (cleanDoc.supervisorRemarks || []).find((r) => r.id === remarkId);
  if (!targetRemark) {
    return {
      success: false,
      document: cleanDoc,
      error: `Directive #${remarkId} not found on document ${cleanDoc.trackingNumber}.`,
    };
  }

  const nowIso = new Date().toISOString();
  const note = complianceNotes.trim() || 'Complied and verified requirements.';

  const updatedRemarks = (cleanDoc.supervisorRemarks || []).map((r) => {
    if (r.id === remarkId) {
      return {
        ...r,
        complied: true,
        compliedAt: nowIso,
        compliedBy: actor.name || 'Staff Member',
        complianceNotes: note,
      };
    }
    return r;
  });

  // Evaluate if all compliance directives are now fulfilled
  const allComplied = updatedRemarks.every((r) => !r.complianceRequired || r.complied);
  const nextStatus = allComplied ? 'Complied / Ready for Clearance' : cleanDoc.currentStatus;

  // Record a movement history event
  const { movement } = createMovementRecord(cleanDoc, {
    actor,
    fromDesk: cleanDoc.currentLocation,
    toDesk: cleanDoc.currentLocation,
    statusUpdate: 'acted',
    notes: `Compliance fulfilled for directive: "${targetRemark.remarkText.slice(0, 40)}..." Note: ${note}`,
    timestamp: nowIso,
  });

  const updatedDoc: DocumentItem = {
    ...cleanDoc,
    supervisorRemarks: updatedRemarks,
    currentStatus: nextStatus,
    movements: [movement, ...(cleanDoc.movements || [])],
    version: (cleanDoc.version || 1) + 1,
    updatedAt: nowIso,
  };

  const notificationMessage = `Compliance fulfilled by ${actor.name} on ${cleanDoc.trackingNumber}`;

  return {
    success: true,
    document: updatedDoc,
    movement,
    notificationMessage,
  };
}

/**
 * Applies Manager Clearance to a document (Approved for Dispatch, Completed/Archived, or Returned for Revision).
 */
export function applyManagerClearance(
  doc: DocumentItem,
  params: {
    clearanceType: 'approved_for_dispatch' | 'archived_completed' | 'returned_for_revision';
    exitTrackingNumber?: string;
    forwardedToExternal?: string;
    clearanceRemarks?: string;
  },
  actor: WorkflowActor
): WorkflowResult {
  const cleanDoc = reconcileDocumentIntegrity(doc);

  if (params.clearanceType === 'returned_for_revision' && !params.clearanceRemarks?.trim()) {
    return {
      success: false,
      document: cleanDoc,
      error: 'Please specify the revisions required before returning.',
    };
  }

  // Cannot approve for dispatch or archive if uncomplied mandatory supervisor remarks exist
  if (
    params.clearanceType !== 'returned_for_revision' &&
    hasUncompliedSupervisorRemarks(cleanDoc)
  ) {
    return {
      success: false,
      document: cleanDoc,
      error: `Cannot clear document ${cleanDoc.trackingNumber}: Uncomplied supervisor directives remain outstanding.`,
    };
  }

  const nowIso = new Date().toISOString();
  const isApproved = params.clearanceType !== 'returned_for_revision';

  const updatedClearance: ManagerClearance = {
    isCleared: isApproved,
    clearedBy: actor.name || 'Manager',
    clearedAt: nowIso,
    clearanceType: params.clearanceType,
    exitTrackingNumber: params.exitTrackingNumber?.trim() || undefined,
    forwardedToExternal: params.forwardedToExternal?.trim() || undefined,
    clearanceRemarks: params.clearanceRemarks?.trim() || undefined,
  };

  let nextStatus: DocumentStatus;
  let nextLocation = cleanDoc.currentLocation;
  let nextDirection = cleanDoc.direction;

  if (params.clearanceType === 'approved_for_dispatch') {
    nextStatus = 'Cleared for Out';
    nextDirection = 'Outgoing';
    nextLocation = 'Dispatch / Outbox Desk';
  } else if (params.clearanceType === 'archived_completed') {
    nextStatus = 'Dispatched / Completed';
    nextDirection = 'Outgoing';
    nextLocation = params.forwardedToExternal?.trim() || 'Central Archival & Dispatched';
  } else {
    // returned_for_revision
    nextStatus = 'Under Review';
  }

  // Record the clearance movement event
  const { movement } = createMovementRecord(cleanDoc, {
    actor,
    fromDesk: cleanDoc.currentLocation,
    toDesk: nextLocation,
    statusUpdate: isApproved ? 'dispatched' : 'in_review',
    notes: `Manager Clearance: ${params.clearanceType.replace(/_/g, ' ').toUpperCase()}.${
      params.clearanceRemarks ? ` Remarks: ${params.clearanceRemarks}` : ''
    }`,
    timestamp: nowIso,
  });

  const updatedDoc: DocumentItem = {
    ...cleanDoc,
    direction: nextDirection,
    currentLocation: nextLocation,
    currentCustodian: isApproved ? (actor.name || 'Dispatch Custodian') : cleanDoc.currentCustodian,
    managerClearance: updatedClearance,
    currentStatus: nextStatus,
    movements: [movement, ...(cleanDoc.movements || [])],
    version: (cleanDoc.version || 1) + 1,
    updatedAt: nowIso,
  };

  const notificationMessage = `Clearance ${params.clearanceType} applied by ${actor.name} on ${cleanDoc.trackingNumber}`;

  return {
    success: true,
    document: updatedDoc,
    movement,
    notificationMessage,
  };
}

/**
 * Forwards a document to a target division/desk.
 */
export function forwardDocumentToDivision(
  doc: DocumentItem,
  targetDivision: string,
  forwardToDesk: string,
  actor: WorkflowActor,
  notes?: string
): WorkflowResult {
  const cleanDoc = reconcileDocumentIntegrity(doc);

  if (cleanDoc.currentStatus === 'Dispatched / Completed') {
    return {
      success: false,
      document: cleanDoc,
      error: `Cannot forward ${cleanDoc.trackingNumber}: Document is already completed and archived.`,
    };
  }

  const division = targetDivision.trim() || cleanDoc.targetDivision;
  const desk = forwardToDesk.trim() || `${division} Desk`;

  let nextStatus = cleanDoc.currentStatus;
  if (cleanDoc.currentStatus === 'Incoming Logged') {
    nextStatus = 'Assigned';
  }

  const { movement, nowIso } = createMovementRecord(cleanDoc, {
    actor,
    fromDesk: cleanDoc.currentLocation,
    toDesk: desk,
    statusUpdate: 'forwarded',
    notes: notes?.trim() || `Forwarded to ${division} (${desk}) by ${actor.name}`,
  });

  const updatedDoc: DocumentItem = {
    ...cleanDoc,
    targetDivision: division,
    currentLocation: desk,
    currentCustodian: actor.name || cleanDoc.currentCustodian,
    currentStatus: nextStatus,
    movements: [movement, ...(cleanDoc.movements || [])],
    version: (cleanDoc.version || 1) + 1,
    updatedAt: nowIso,
  };

  return {
    success: true,
    document: updatedDoc,
    movement,
    notificationMessage: `Document ${cleanDoc.trackingNumber} forwarded to ${division}`,
  };
}

/**
 * Updates document priority with an audit movement event.
 */
export function updateDocumentPriority(
  doc: DocumentItem,
  newPriority: 'Routine' | 'Urgent' | 'Rush',
  actor: WorkflowActor,
  reason?: string
): WorkflowResult {
  const cleanDoc = reconcileDocumentIntegrity(doc);

  if (cleanDoc.priority === newPriority) {
    return { success: true, document: cleanDoc };
  }

  const nowIso = new Date().toISOString();
  const oldPriority = cleanDoc.priority;

  const { movement } = createMovementRecord(cleanDoc, {
    actor,
    fromDesk: cleanDoc.currentLocation,
    toDesk: cleanDoc.currentLocation,
    statusUpdate: 'acted',
    notes: `Priority escalated from ${oldPriority} to ${newPriority}.${reason ? ` Reason: ${reason}` : ''}`,
    timestamp: nowIso,
  });

  const updatedDoc: DocumentItem = {
    ...cleanDoc,
    priority: newPriority,
    movements: [movement, ...(cleanDoc.movements || [])],
    version: (cleanDoc.version || 1) + 1,
    updatedAt: nowIso,
  };

  return {
    success: true,
    document: updatedDoc,
    movement,
    notificationMessage: `Priority for ${cleanDoc.trackingNumber} updated to ${newPriority}`,
  };
}

/**
 * Centralized Batch Actions Processor
 * Evaluates each document against centralized business rules without bypassing transitions.
 */
export function executeBatchAction(
  docs: DocumentItem[],
  actionCode: string,
  actor: WorkflowActor
): BatchWorkflowResult {
  const results: BatchWorkflowResult = {
    totalProcessed: docs.length,
    succeeded: 0,
    failed: 0,
    updatedDocuments: [],
    errors: [],
  };

  for (const doc of docs) {
    let res: WorkflowResult;

    if (actionCode === 'clear_out' || actionCode === 'status:Cleared for Out') {
      res = applyManagerClearance(
        doc,
        {
          clearanceType: 'approved_for_dispatch',
          clearanceRemarks: 'Authorized via Batch Action',
        },
        actor
      );
    } else if (actionCode === 'status:Dispatched / Completed') {
      res = applyManagerClearance(
        doc,
        {
          clearanceType: 'archived_completed',
          clearanceRemarks: 'Archived via Batch Action',
        },
        actor
      );
    } else if (actionCode.startsWith('forward:')) {
      const targetDept = actionCode.replace('forward:', '').trim();
      res = forwardDocumentToDivision(
        doc,
        targetDept,
        `${targetDept} Desk`,
        actor,
        `Batch routed to ${targetDept}`
      );
    } else if (actionCode.startsWith('assign:')) {
      const focalPerson = actionCode.replace('assign:', '').trim();
      
      const { movement, nowIso } = createMovementRecord(doc, {
        actor,
        fromDesk: doc.currentLocation,
        toDesk: doc.currentLocation,
        statusUpdate: 'forwarded',
        notes: `Assigned focal person: ${focalPerson} via Batch Action`,
      });
      const updated: DocumentItem = {
        ...doc,
        responsiblePerson: focalPerson,
        movements: [movement, ...(doc.movements || [])],
        version: (doc.version || 1) + 1,
        updatedAt: nowIso,
      };
      res = { success: true, document: updated, movement };
    } else if (actionCode.startsWith('priority:')) {
      const newPriority = actionCode.replace('priority:', '').trim() as 'Routine' | 'Urgent' | 'Rush';
      res = updateDocumentPriority(doc, newPriority, actor, 'Batch priority adjustment');
    } else if (actionCode.startsWith('status:')) {
      const targetStatus = actionCode.replace('status:', '').trim() as DocumentStatus;
      const validation = validateStatusTransition(doc, targetStatus, actor);
      if (!validation.valid) {
        res = {
          success: false,
          document: doc,
          error: validation.reason,
        };
      } else {
        const { movement, nowIso } = createMovementRecord(doc, {
          actor,
          fromDesk: doc.currentLocation,
          toDesk: doc.currentLocation,
          statusUpdate: 'in_review',
          notes: `Status changed to "${targetStatus}" via Batch Action`,
        });
        const updated: DocumentItem = {
          ...doc,
          currentStatus: targetStatus,
          movements: [movement, ...(doc.movements || [])],
          version: (doc.version || 1) + 1,
          updatedAt: nowIso,
        };
        res = { success: true, document: updated, movement };
      }
    } else {
      res = {
        success: false,
        document: doc,
        error: `Unrecognized batch action command: ${actionCode}`,
      };
    }

    if (res.success) {
      results.succeeded++;
      results.updatedDocuments.push(res.document);
    } else {
      results.failed++;
      results.updatedDocuments.push(doc); // preserve untouched
      results.errors.push({
        documentId: doc.id,
        trackingNumber: doc.trackingNumber,
        reason: res.error || 'Validation rule rejection',
      });
    }
  }

  return results;
}

/**
 * Validates optimistic concurrency between existing state and incoming update.
 */
export function validateConcurrency(
  existingDoc: DocumentItem,
  proposedDoc: DocumentItem
): { hasConflict: boolean; reason?: string } {
  const existingVersion = existingDoc.version || 1;
  const proposedVersion = proposedDoc.version || 1;

  if (proposedVersion < existingVersion) {
    return {
      hasConflict: true,
      reason: `Conflict detected: Document ${existingDoc.trackingNumber} has been updated concurrently (Server v${existingVersion} > Client v${proposedVersion}). Please refresh before making further changes.`,
    };
  }

  return { hasConflict: false };
}
