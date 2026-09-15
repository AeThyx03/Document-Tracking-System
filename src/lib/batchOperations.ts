/**
 * POSSD Document Tracking System - Batch Operations Engine
 * 
 * Enforces PostgreSQL as the single authoritative source of truth.
 * Guarantees data integrity for all batch operations (status changes,
 * priority updates, routing/forwarding, manager clearance, and deletion).
 * 
 * Core Invariants:
 * 1. UI local state is NEVER updated for a document unless PostgreSQL confirms persistence.
 * 2. Silent failures are strictly forbidden: every document is explicitly tracked as
 *    'successful', 'failed', or 'queued_offline'.
 * 3. Optimistic concurrency control (expectedVersion) is enforced to prevent overwriting newer versions.
 * 4. Stale or conflicted local versions are refreshed from PostgreSQL.
 * 5. Notifications and audit entries reflect only operations accepted by the backend.
 */

import { DocumentItem } from '../types';
import { executeBatchAction, WorkflowActor } from './workflow';
import * as api from './api';
import { enqueueMutation } from './offlineQueue';

export type BatchItemStatus = 'successful' | 'failed' | 'queued_offline';

export interface BatchItemError {
  code: string;
  message: string;
  isConflict?: boolean;
  details?: any;
}

export interface BatchItemResult {
  documentId: string;
  trackingNumber: string;
  status: BatchItemStatus;
  persistedDoc?: DocumentItem;
  error?: BatchItemError;
}

export interface BatchExecutionReport {
  action: string;
  total: number;
  succeeded: number;
  failed: number;
  queuedOffline: number;
  items: BatchItemResult[];
  summaryMessage: string;
  timestamp: string;
}

/**
 * Validates whether an offline mutation is safe to replay online.
 * Requires valid document identifier and explicit expected base version.
 */
export function isBatchOperationSafeToReplay(payload: any): boolean {
  if (!payload || typeof payload !== 'object') return false;
  if (!payload.id && !payload.documentId) return false;
  // Mutations with explicit expectedVersion allow backend concurrency rejection on replay
  return payload.expectedVersion !== undefined && typeof payload.expectedVersion === 'number';
}

/**
 * Formats user-facing notification title and message from a batch report.
 */
export function formatBatchNotification(
  report: BatchExecutionReport,
  actionLabel: string,
  actorName: string
): { title: string; message: string; type: 'sync' | 'urgent' } {
  if (report.failed === 0 && report.queuedOffline === 0) {
    return {
      title: 'Batch Action Completed',
      message: `Successfully applied ${actionLabel} to all ${report.succeeded} document(s).`,
      type: 'sync',
    };
  }

  if (report.succeeded === 0 && report.queuedOffline === 0) {
    const errorSummaries = report.items
      .filter((i) => i.status === 'failed')
      .slice(0, 3)
      .map((i) => `${i.trackingNumber}: ${i.error?.message}`)
      .join('; ');

    return {
      title: 'Batch Action Failed',
      message: `0 of ${report.total} document(s) updated. Rejections: ${errorSummaries || 'Operation failed in database.'}`,
      type: 'urgent',
    };
  }

  // Partial success
  const parts: string[] = [`${report.succeeded} succeeded`, `${report.failed} failed`];
  if (report.queuedOffline > 0) {
    parts.push(`${report.queuedOffline} queued offline`);
  }

  const failedItems = report.items
    .filter((i) => i.status === 'failed')
    .slice(0, 3)
    .map((i) => `${i.trackingNumber}: ${i.error?.message}`)
    .join('; ');

  return {
    title: 'Batch Action Completed with Warnings',
    message: `Batch update: ${parts.join(', ')}.${failedItems ? ` Issues: ${failedItems}` : ''}`,
    type: 'urgent',
  };
}

export interface BatchExecutionOptions {
  isOffline?: boolean;
  onProgress?: (processed: number, total: number) => void;
  apiClient?: {
    updateDocument?: (doc: DocumentItem, options?: { expectedVersion?: number }) => Promise<DocumentItem>;
    deleteDocument?: (id: string) => Promise<void>;
    fetchDocumentById?: (id: string) => Promise<DocumentItem | null>;
  };
  queueMutation?: (mutation: any) => Promise<string>;
}

/**
 * Executes a batch document action (status, priority, forward, clearance).
 * 
 * Step 1: Validates centralized business rules for each document.
 * Step 2: For passing documents, attempts optimistic concurrency update to PostgreSQL.
 * Step 3: Tracks success, failure, or offline queue per document.
 * Step 4: Refreshes conflicted documents from PostgreSQL so the user sees true server state.
 * Step 5: Updates local authoritative React state ONLY for verified persisted changes.
 */
export async function executeBatchDocumentAction(
  allDocuments: DocumentItem[],
  selectedDocIds: Set<string>,
  actionCode: string,
  actor: WorkflowActor,
  options?: BatchExecutionOptions
): Promise<{
  report: BatchExecutionReport;
  updatedAllDocuments: DocumentItem[];
}> {
  const selectedDocs = allDocuments.filter((d) => selectedDocIds.has(d.id));
  const docMap = new Map<string, DocumentItem>(allDocuments.map((d) => [d.id, d]));

  const itemResults: BatchItemResult[] = [];
  let succeeded = 0;
  let failed = 0;
  let queuedOffline = 0;

  const updateDoc = options?.apiClient?.updateDocument || api.updateDocument;
  const fetchDocById = options?.apiClient?.fetchDocumentById || api.fetchDocumentById;
  const enqueue = options?.queueMutation || enqueueMutation;

  const isOffline =
    options?.isOffline !== undefined
      ? options.isOffline
      : typeof navigator !== 'undefined' && navigator.onLine === false;

  for (let i = 0; i < selectedDocs.length; i++) {
    const originalDoc = selectedDocs[i];
    const expectedVersion = originalDoc.version || 1;

    // 1. Business rule validation check using workflow engine
    const workflowCheck = executeBatchAction([originalDoc], actionCode, actor);

    if (workflowCheck.failed > 0) {
      const errReason = workflowCheck.errors[0]?.reason || 'Business rule validation rejection';
      itemResults.push({
        documentId: originalDoc.id,
        trackingNumber: originalDoc.trackingNumber,
        status: 'failed',
        persistedDoc: originalDoc,
        error: {
          code: 'BUSINESS_RULE_VIOLATION',
          message: errReason,
        },
      });
      failed++;
      // Authoritative invariant: originalDoc remains unchanged in docMap
      if (options?.onProgress) options.onProgress(i + 1, selectedDocs.length);
      continue;
    }

    const proposedDoc = workflowCheck.updatedDocuments[0];

    // 2. Offline queue handling
    if (isOffline) {
      const isSafe = isBatchOperationSafeToReplay({
        id: proposedDoc.id,
        expectedVersion,
      });

      if (isSafe) {
        try {
          await enqueue({
            endpoint: `/api/documents/${encodeURIComponent(proposedDoc.id)}`,
            method: 'PUT',
            payload: { ...proposedDoc, expectedVersion },
            entity: 'document',
            entityId: proposedDoc.id,
            operationType: 'UPDATE',
          });

          itemResults.push({
            documentId: originalDoc.id,
            trackingNumber: originalDoc.trackingNumber,
            status: 'queued_offline',
            persistedDoc: originalDoc, // Invariant: do not claim persisted until online sync
          });
          queuedOffline++;
        } catch (queueErr: any) {
          itemResults.push({
            documentId: originalDoc.id,
            trackingNumber: originalDoc.trackingNumber,
            status: 'failed',
            persistedDoc: originalDoc,
            error: {
              code: 'OFFLINE_QUEUE_ERROR',
              message: queueErr.message || 'Failed to enqueue offline mutation',
            },
          });
          failed++;
        }
      } else {
        itemResults.push({
          documentId: originalDoc.id,
          trackingNumber: originalDoc.trackingNumber,
          status: 'failed',
          persistedDoc: originalDoc,
          error: {
            code: 'UNSAFE_OFFLINE_OPERATION',
            message: 'Operation cannot be safely queued offline without concurrency versioning.',
          },
        });
        failed++;
      }

      if (options?.onProgress) options.onProgress(i + 1, selectedDocs.length);
      continue;
    }

    // 3. Online persistence to PostgreSQL with optimistic concurrency check
    try {
      const persistedDoc = await updateDoc(proposedDoc, { expectedVersion });

      // AUTHORITATIVE WRITE CONFIRMED: Update local state with PostgreSQL response
      docMap.set(persistedDoc.id, persistedDoc);
      itemResults.push({
        documentId: originalDoc.id,
        trackingNumber: originalDoc.trackingNumber,
        status: 'successful',
        persistedDoc,
      });
      succeeded++;
    } catch (err: any) {
      const isConflict =
        err.status === 409 ||
        err.code === 'CONCURRENCY_CONFLICT' ||
        err.code === 'CONFLICT' ||
        err.message?.toLowerCase().includes('concurrency') ||
        err.message?.toLowerCase().includes('conflict');

      const isNetwork =
        err.status === 503 ||
        err.code === 'NETWORK_ERROR' ||
        err.message?.toLowerCase().includes('network') ||
        err.message?.toLowerCase().includes('failed to fetch');

      if (isNetwork) {
        // Fallback to offline queue if safe
        try {
          await enqueue({
            endpoint: `/api/documents/${encodeURIComponent(proposedDoc.id)}`,
            method: 'PUT',
            payload: { ...proposedDoc, expectedVersion },
            entity: 'document',
            entityId: proposedDoc.id,
            operationType: 'UPDATE',
          });

          itemResults.push({
            documentId: originalDoc.id,
            trackingNumber: originalDoc.trackingNumber,
            status: 'queued_offline',
            persistedDoc: originalDoc,
          });
          queuedOffline++;
        } catch {
          itemResults.push({
            documentId: originalDoc.id,
            trackingNumber: originalDoc.trackingNumber,
            status: 'failed',
            persistedDoc: originalDoc,
            error: {
              code: 'NETWORK_ERROR',
              message: err.message || 'Network connection failed during batch persistence',
            },
          });
          failed++;
        }
      } else {
        // Server rejected write (409 conflict, 403 forbidden, 400 validation, 500 error)
        let refreshedServerDoc: DocumentItem | null = null;

        // Invariant 6: Refresh from server if conflict or failure occurs
        if (isConflict) {
          try {
            refreshedServerDoc = await fetchDocById(originalDoc.id);
            if (refreshedServerDoc) {
              docMap.set(refreshedServerDoc.id, refreshedServerDoc);
            }
          } catch (refreshErr) {
            console.warn(`[POSSD Batch] Failed to refresh document ${originalDoc.id} after conflict:`, refreshErr);
          }
        }

        itemResults.push({
          documentId: originalDoc.id,
          trackingNumber: originalDoc.trackingNumber,
          status: 'failed',
          persistedDoc: refreshedServerDoc || originalDoc,
          error: {
            code: err.code || (isConflict ? 'CONCURRENCY_CONFLICT' : 'API_ERROR'),
            message:
              err.message ||
              (isConflict
                ? 'Document was modified concurrently by another user. Local view refreshed.'
                : 'Failed to update document in database.'),
            isConflict,
            details: err.details,
          },
        });
        failed++;
      }
    }

    if (options?.onProgress) options.onProgress(i + 1, selectedDocs.length);
  }

  // Build accurate summary message
  let summaryMessage = '';
  if (failed === 0 && queuedOffline === 0) {
    summaryMessage = `All ${succeeded} document(s) successfully updated in PostgreSQL.`;
  } else if (succeeded === 0 && queuedOffline === 0) {
    summaryMessage = `0 succeeded, ${failed} failed. No changes were persisted to database.`;
  } else {
    const parts: string[] = [`${succeeded} succeeded`, `${failed} failed`];
    if (queuedOffline > 0) parts.push(`${queuedOffline} queued offline`);
    summaryMessage = parts.join(', ');
  }

  const report: BatchExecutionReport = {
    action: actionCode,
    total: selectedDocs.length,
    succeeded,
    failed,
    queuedOffline,
    items: itemResults,
    summaryMessage,
    timestamp: new Date().toISOString(),
  };

  return {
    report,
    updatedAllDocuments: Array.from(docMap.values()),
  };
}

/**
 * Executes a batch document deletion.
 * 
 * Enforces executive authorization, handles offline queuing safely,
 * and removes documents from local state ONLY when PostgreSQL confirms deletion.
 */
export async function executeBatchDocumentDelete(
  allDocuments: DocumentItem[],
  docsToDelete: DocumentItem[],
  actor: WorkflowActor,
  options?: BatchExecutionOptions
): Promise<{
  report: BatchExecutionReport;
  updatedAllDocuments: DocumentItem[];
}> {
  const docMap = new Map<string, DocumentItem>(allDocuments.map((d) => [d.id, d]));
  const itemResults: BatchItemResult[] = [];
  let succeeded = 0;
  let failed = 0;
  let queuedOffline = 0;

  const deleteDoc = options?.apiClient?.deleteDocument || api.deleteDocument;
  const enqueue = options?.queueMutation || enqueueMutation;

  // Authorization check: only System Admin and Department Manager may delete
  const isAuthorized = actor.role === 'System Admin' || actor.role === 'Department Manager';
  if (!isAuthorized) {
    for (const doc of docsToDelete) {
      itemResults.push({
        documentId: doc.id,
        trackingNumber: doc.trackingNumber,
        status: 'failed',
        persistedDoc: doc,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied: Role "${actor.role}" cannot delete documents.`,
        },
      });
      failed++;
    }

    const report: BatchExecutionReport = {
      action: 'delete_batch',
      total: docsToDelete.length,
      succeeded: 0,
      failed,
      queuedOffline: 0,
      items: itemResults,
      summaryMessage: `0 deleted, ${failed} failed. Unauthorized role.`,
      timestamp: new Date().toISOString(),
    };

    return {
      report,
      updatedAllDocuments: allDocuments,
    };
  }

  const isOffline =
    options?.isOffline !== undefined
      ? options.isOffline
      : typeof navigator !== 'undefined' && navigator.onLine === false;

  for (let i = 0; i < docsToDelete.length; i++) {
    const doc = docsToDelete[i];

    if (isOffline) {
      try {
        await enqueue({
          endpoint: `/api/documents/${encodeURIComponent(doc.id)}`,
          method: 'DELETE',
          payload: null,
          entity: 'document',
          entityId: doc.id,
          operationType: 'DELETE',
        });

        itemResults.push({
          documentId: doc.id,
          trackingNumber: doc.trackingNumber,
          status: 'queued_offline',
          persistedDoc: doc, // Document retained in UI until confirmed deleted
        });
        queuedOffline++;
      } catch (queueErr: any) {
        itemResults.push({
          documentId: doc.id,
          trackingNumber: doc.trackingNumber,
          status: 'failed',
          persistedDoc: doc,
          error: {
            code: 'OFFLINE_QUEUE_ERROR',
            message: queueErr.message || 'Failed to enqueue delete mutation',
          },
        });
        failed++;
      }

      if (options?.onProgress) options.onProgress(i + 1, docsToDelete.length);
      continue;
    }

    // Online delete call to PostgreSQL
    try {
      await deleteDoc(doc.id);
      // AUTHORITATIVE DELETE CONFIRMED: Remove from local state
      docMap.delete(doc.id);
      itemResults.push({
        documentId: doc.id,
        trackingNumber: doc.trackingNumber,
        status: 'successful',
      });
      succeeded++;
    } catch (err: any) {
      if (err.status === 404 || err.code === 'NOT_FOUND') {
        // Document already deleted in PostgreSQL -> reconcile local state
        docMap.delete(doc.id);
        itemResults.push({
          documentId: doc.id,
          trackingNumber: doc.trackingNumber,
          status: 'successful',
        });
        succeeded++;
      } else {
        const isNetwork =
          err.status === 503 ||
          err.code === 'NETWORK_ERROR' ||
          err.message?.toLowerCase().includes('network');

        if (isNetwork) {
          try {
            await enqueue({
              endpoint: `/api/documents/${encodeURIComponent(doc.id)}`,
              method: 'DELETE',
              payload: null,
              entity: 'document',
              entityId: doc.id,
              operationType: 'DELETE',
            });
            itemResults.push({
              documentId: doc.id,
              trackingNumber: doc.trackingNumber,
              status: 'queued_offline',
              persistedDoc: doc,
            });
            queuedOffline++;
          } catch {
            itemResults.push({
              documentId: doc.id,
              trackingNumber: doc.trackingNumber,
              status: 'failed',
              persistedDoc: doc,
              error: {
                code: 'NETWORK_ERROR',
                message: err.message || 'Network connection failed during delete',
              },
            });
            failed++;
          }
        } else {
          // Server rejected deletion (403, 500) -> document REMAINS in local state
          itemResults.push({
            documentId: doc.id,
            trackingNumber: doc.trackingNumber,
            status: 'failed',
            persistedDoc: doc,
            error: {
              code: err.code || 'DELETE_FAILED',
              message: err.message || 'Failed to delete document from database',
              details: err.details,
            },
          });
          failed++;
        }
      }
    }

    if (options?.onProgress) options.onProgress(i + 1, docsToDelete.length);
  }

  let summaryMessage = '';
  if (failed === 0 && queuedOffline === 0) {
    summaryMessage = `All ${succeeded} document(s) permanently deleted in PostgreSQL.`;
  } else if (succeeded === 0 && queuedOffline === 0) {
    summaryMessage = `0 deleted, ${failed} failed. No documents were deleted in database.`;
  } else {
    const parts: string[] = [`${succeeded} succeeded`, `${failed} failed`];
    if (queuedOffline > 0) parts.push(`${queuedOffline} queued offline`);
    summaryMessage = parts.join(', ');
  }

  const report: BatchExecutionReport = {
    action: 'delete_batch',
    total: docsToDelete.length,
    succeeded,
    failed,
    queuedOffline,
    items: itemResults,
    summaryMessage,
    timestamp: new Date().toISOString(),
  };

  return {
    report,
    updatedAllDocuments: Array.from(docMap.values()),
  };
}
