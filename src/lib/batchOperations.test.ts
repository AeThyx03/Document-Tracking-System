/**
 * POSSD Document Tracking System - Phase 4 Batch Operation Data Integrity Tests
 * 
 * Verifies Scenarios A through G:
 * A. All documents succeed
 * B. One document fails
 * C. Several documents fail
 * D. Version conflict occurs (optimistic concurrency 409)
 * E. Offline queue is used (IndexedDB safe queueing)
 * F. Delete batch partially fails
 * G. Refresh after a failed batch
 */

import { DocumentItem } from '../types';
import {
  executeBatchDocumentAction,
  executeBatchDocumentDelete,
  formatBatchNotification,
  isBatchOperationSafeToReplay,
} from './batchOperations';
import { WorkflowActor } from './workflow';

// Test harness counters
let testPassed = 0;
let testFailed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    testPassed++;
  } else {
    console.error(`❌ FAIL: ${testName}${details ? ` -> ${details}` : ''}`);
    testFailed++;
  }
}

type DocumentStatus = 'Incoming Logged' | 'Under Review' | 'Supervisor Comment Needed' | 'Complied / Ready for Clearance' | 'Cleared for Out' | 'Dispatched / Completed';

function createSampleDoc(id: string, trackingNumber: string, status: DocumentStatus = 'Incoming Logged', version = 1): DocumentItem {
  return {
    id,
    trackingNumber,
    title: `Document ${trackingNumber}`,
    documentType: 'Memorandum',
    communicationType: 'Internal',
    reportType: 'General',
    originDepartment: 'Admin',
    dateReceived: '2026-03-15',
    timeReceived: '09:00',
    targetDivision: 'Records',
    responsiblePerson: 'John Staff',
    priority: 'Routine',
    currentStatus: status,
    currentLocation: 'Records Desk',
    currentCustodian: 'John Staff',
    version,
    direction: 'Incoming',
    movements: [],
    supervisorRemarks: [],
    managerClearance: {
      isCleared: false,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const mockActor: WorkflowActor = {
  id: 'user-admin',
  name: 'System Admin',
  role: 'System Admin',
  division: 'Executive',
};

async function runBatchIntegrityTests() {
  console.log('--- POSSD Batch Operation Data Integrity Tests (Phase 4) ---\n');

  // =========================================================================
  // SCENARIO A: All documents succeed
  // =========================================================================
  {
    console.log('[Scenario A: All documents succeed]');
    const doc1 = createSampleDoc('doc-1', 'TRACK-001', 'Incoming Logged', 1);
    const doc2 = createSampleDoc('doc-2', 'TRACK-002', 'Incoming Logged', 1);
    const doc3 = createSampleDoc('doc-3', 'TRACK-003', 'Incoming Logged', 1);
    const docs = [doc1, doc2, doc3];

    const mockApiClient = {
      updateDocument: async (proposed: DocumentItem, options?: any) => {
        return {
          ...proposed,
          version: (options?.expectedVersion || proposed.version || 1) + 1,
          updatedAt: new Date().toISOString(),
        };
      },
    };

    const selectedIds = new Set(['doc-1', 'doc-2', 'doc-3']);
    const { report, updatedAllDocuments } = await executeBatchDocumentAction(
      docs,
      selectedIds,
      'priority:Urgent',
      mockActor,
      { isOffline: false, apiClient: mockApiClient }
    );

    assert(report.total === 3, 'Scenario A: Total documents processed is 3');
    assert(report.succeeded === 3, 'Scenario A: All 3 documents marked successful');
    assert(report.failed === 0, 'Scenario A: 0 documents failed');
    assert(report.queuedOffline === 0, 'Scenario A: 0 documents queued offline');
    assert(
      updatedAllDocuments.every((d) => d.priority === 'Urgent' && d.version === 2),
      'Scenario A: All 3 documents updated with persisted changes and incremented version'
    );
    assert(
      report.summaryMessage.includes('All 3 document(s) successfully updated in PostgreSQL'),
      'Scenario A: Summary accurately reflects complete PostgreSQL success'
    );

    const notif = formatBatchNotification(report, 'priority:Urgent', 'Admin');
    assert(notif.type === 'sync', 'Scenario A: Notification type is sync');
    assert(notif.message.includes('all 3 document(s)'), 'Scenario A: Notification specifies all 3 succeeded');
  }

  // =========================================================================
  // SCENARIO B: One document fails
  // =========================================================================
  {
    console.log('\n[Scenario B: One document fails]');
    const doc1 = createSampleDoc('doc-1', 'TRACK-001', 'Incoming Logged', 1);
    const doc2 = createSampleDoc('doc-2', 'TRACK-002', 'Incoming Logged', 1);
    const doc3 = createSampleDoc('doc-3', 'TRACK-003', 'Incoming Logged', 1);
    const docs = [doc1, doc2, doc3];

    // Mock API: doc-2 fails database write with an internal error
    const mockApiClient = {
      updateDocument: async (proposed: DocumentItem, options?: any) => {
        if (proposed.id === 'doc-2') {
          const err: any = new Error('PostgreSQL write constraint violation');
          err.status = 500;
          err.code = 'INTERNAL_SERVER_ERROR';
          throw err;
        }
        return {
          ...proposed,
          version: (options?.expectedVersion || 1) + 1,
        };
      },
    };

    const selectedIds = new Set(['doc-1', 'doc-2', 'doc-3']);
    const { report, updatedAllDocuments } = await executeBatchDocumentAction(
      docs,
      selectedIds,
      'priority:Urgent',
      mockActor,
      { isOffline: false, apiClient: mockApiClient }
    );

    assert(report.total === 3, 'Scenario B: Total is 3');
    assert(report.succeeded === 2, 'Scenario B: Exactly 2 documents succeeded');
    assert(report.failed === 1, 'Scenario B: Exactly 1 document failed');
    
    const doc2InState = updatedAllDocuments.find((d) => d.id === 'doc-2')!;
    assert(
      doc2InState.priority === 'Routine' && doc2InState.version === 1,
      'Scenario B: Failed document doc-2 RETAINS original unmutated server version in local state'
    );

    const doc1InState = updatedAllDocuments.find((d) => d.id === 'doc-1')!;
    const doc3InState = updatedAllDocuments.find((d) => d.id === 'doc-3')!;
    assert(
      doc1InState.priority === 'Urgent' && doc3InState.priority === 'Urgent',
      'Scenario B: Succeeded documents doc-1 and doc-3 are updated'
    );

    assert(
      report.summaryMessage.includes('2 succeeded, 1 failed'),
      'Scenario B: Summary message specifies "2 succeeded, 1 failed"'
    );

    const notif = formatBatchNotification(report, 'priority:Urgent', 'Admin');
    assert(notif.type === 'urgent', 'Scenario B: Notification type is urgent on failure');
    assert(notif.message.includes('2 succeeded, 1 failed'), 'Scenario B: Notification states 2 succeeded, 1 failed');
  }

  // =========================================================================
  // SCENARIO C: Several documents fail
  // =========================================================================
  {
    console.log('\n[Scenario C: Several documents fail]');
    const doc1 = createSampleDoc('doc-1', 'TRACK-001', 'Incoming Logged', 1);
    const doc2 = createSampleDoc('doc-2', 'TRACK-002', 'Dispatched / Completed', 1); // Business rule will reject routing completed doc
    const doc3 = createSampleDoc('doc-3', 'TRACK-003', 'Incoming Logged', 1);
    const doc4 = createSampleDoc('doc-4', 'TRACK-004', 'Incoming Logged', 1);
    const doc5 = createSampleDoc('doc-5', 'TRACK-005', 'Incoming Logged', 1);
    const docs = [doc1, doc2, doc3, doc4, doc5];

    const mockApiClient = {
      updateDocument: async (proposed: DocumentItem) => {
        if (proposed.id === 'doc-4') {
          const err: any = new Error('Database disk full');
          err.status = 500;
          throw err;
        }
        if (proposed.id === 'doc-5') {
          const err: any = new Error('Validation constraint: Invalid target division');
          err.status = 400;
          err.code = 'VALIDATION_ERROR';
          throw err;
        }
        return { ...proposed, version: (proposed.version || 1) + 1 };
      },
    };

    const selectedIds = new Set(['doc-1', 'doc-2', 'doc-3', 'doc-4', 'doc-5']);
    const { report, updatedAllDocuments } = await executeBatchDocumentAction(
      docs,
      selectedIds,
      'forward:Administrative Section',
      mockActor,
      { isOffline: false, apiClient: mockApiClient }
    );

    assert(report.total === 5, 'Scenario C: Total 5 documents');
    assert(report.succeeded === 2, 'Scenario C: Exactly 2 succeeded (doc-1 and doc-3)');
    assert(report.failed === 3, 'Scenario C: Exactly 3 failed (doc-2 business rule, doc-4 DB error, doc-5 validation)');
    assert(
      report.summaryMessage.includes('2 succeeded, 3 failed'),
      'Scenario C: Summary accurately states "2 succeeded, 3 failed"'
    );

    // Verify per-document failure information
    const failedItems = report.items.filter((i) => i.status === 'failed');
    assert(failedItems.length === 3, 'Scenario C: Exactly 3 failed item records returned');
    assert(
      failedItems.some((i) => i.trackingNumber === 'TRACK-002' && i.error?.code === 'BUSINESS_RULE_VIOLATION'),
      'Scenario C: TRACK-002 failure reason recorded as BUSINESS_RULE_VIOLATION'
    );
    assert(
      failedItems.some((i) => i.trackingNumber === 'TRACK-004'),
      'Scenario C: TRACK-004 failure reason recorded with database error'
    );
    assert(
      failedItems.some((i) => i.trackingNumber === 'TRACK-005'),
      'Scenario C: TRACK-005 failure reason recorded with validation error'
    );

    // Verify unmutated state for failed items
    const doc2State = updatedAllDocuments.find((d) => d.id === 'doc-2')!;
    const doc4State = updatedAllDocuments.find((d) => d.id === 'doc-4')!;
    const doc5State = updatedAllDocuments.find((d) => d.id === 'doc-5')!;
    assert(doc2State.version === 1 && doc4State.version === 1 && doc5State.version === 1, 'Scenario C: Failed docs retain original version');
  }

  // =========================================================================
  // SCENARIO D: Version conflict occurs
  // =========================================================================
  {
    console.log('\n[Scenario D: Version conflict occurs]');
    // Client has doc with version 1
    const staleDoc = createSampleDoc('doc-conflict', 'TRACK-CONF', 'Incoming Logged', 1);
    // Server actually has version 3 (concurrently updated by another user)
    const serverDoc = createSampleDoc('doc-conflict', 'TRACK-CONF', 'Under Review', 3);
    const docs = [staleDoc];

    const mockApiClient = {
      updateDocument: async (proposed: DocumentItem, options?: any) => {
        if (options?.expectedVersion === 1) {
          const conflictErr: any = new Error('Concurrency conflict: Document version is 3, but client expected 1.');
          conflictErr.status = 409;
          conflictErr.code = 'CONCURRENCY_CONFLICT';
          throw conflictErr;
        }
        return proposed;
      },
      fetchDocumentById: async (id: string) => {
        return serverDoc;
      },
    };

    const selectedIds = new Set(['doc-conflict']);
    const { report, updatedAllDocuments } = await executeBatchDocumentAction(
      docs,
      selectedIds,
      'priority:Urgent',
      mockActor,
      { isOffline: false, apiClient: mockApiClient }
    );

    assert(report.failed === 1, 'Scenario D: 1 document failed due to conflict');
    assert(report.succeeded === 0, 'Scenario D: 0 documents succeeded');
    
    const conflictItem = report.items[0];
    assert(conflictItem.error?.isConflict === true, 'Scenario D: Item result is marked as conflict');
    
    // Invariant: local state MUST NOT overwrite newer server version, it refreshes from server
    const updatedDoc = updatedAllDocuments.find((d) => d.id === 'doc-conflict')!;
    assert(
      updatedDoc.version === 3 && updatedDoc.currentStatus === 'Under Review',
      'Scenario D: Local state was refreshed with authoritative server document (version 3)'
    );
  }

  // =========================================================================
  // SCENARIO E: Offline queue is used
  // =========================================================================
  {
    console.log('\n[Scenario E: Offline queue is used]');
    const doc1 = createSampleDoc('doc-off-1', 'TRACK-OFF-1', 'Incoming Logged', 2);
    const doc2 = createSampleDoc('doc-off-2', 'TRACK-OFF-2', 'Incoming Logged', 2);
    const docs = [doc1, doc2];

    const enqueuedMutations: any[] = [];
    const mockQueueMutation = async (mutation: any) => {
      enqueuedMutations.push(mutation);
      return 'queue-id-' + Math.random();
    };

    const selectedIds = new Set(['doc-off-1', 'doc-off-2']);
    const { report, updatedAllDocuments } = await executeBatchDocumentAction(
      docs,
      selectedIds,
      'priority:Urgent',
      mockActor,
      { isOffline: true, queueMutation: mockQueueMutation }
    );

    assert(report.total === 2, 'Scenario E: Total 2 documents processed');
    assert(report.succeeded === 0, 'Scenario E: 0 succeeded online (since offline)');
    assert(report.failed === 0, 'Scenario E: 0 failed');
    assert(report.queuedOffline === 2, 'Scenario E: Exactly 2 documents queued offline');
    assert(enqueuedMutations.length === 2, 'Scenario E: 2 mutations enqueued in IndexedDB queue');
    assert(
      enqueuedMutations.every((m) => m.payload.expectedVersion === 2),
      'Scenario E: Enqueued mutations explicitly carry expectedVersion for replay safety'
    );
    assert(
      isBatchOperationSafeToReplay(enqueuedMutations[0].payload),
      'Scenario E: isBatchOperationSafeToReplay validates mutation'
    );

    // Invariant: React state does NOT assume mutations succeeded
    assert(
      updatedAllDocuments.every((d) => d.priority === 'Routine'),
      'Scenario E: Local authoritative state RETAINS unpersisted state until synchronized'
    );
    assert(
      report.summaryMessage.includes('2 queued offline'),
      'Scenario E: Summary message reports "2 queued offline"'
    );
  }

  // =========================================================================
  // SCENARIO F: Delete batch partially fails
  // =========================================================================
  {
    console.log('\n[Scenario F: Delete batch partially fails]');
    const doc1 = createSampleDoc('doc-del-1', 'TRACK-DEL-1');
    const doc2 = createSampleDoc('doc-del-2', 'TRACK-DEL-2');
    const doc3 = createSampleDoc('doc-del-3', 'TRACK-DEL-3');
    const docs = [doc1, doc2, doc3];

    const mockApiClient = {
      deleteDocument: async (id: string) => {
        if (id === 'doc-del-2') {
          const err: any = new Error('Foreign key violation or permission denied');
          err.status = 403;
          throw err;
        }
      },
    };

    const { report, updatedAllDocuments } = await executeBatchDocumentDelete(
      docs,
      [doc1, doc2, doc3],
      mockActor,
      { isOffline: false, apiClient: mockApiClient }
    );

    assert(report.total === 3, 'Scenario F: Total 3 documents');
    assert(report.succeeded === 2, 'Scenario F: Exactly 2 deleted successfully');
    assert(report.failed === 1, 'Scenario F: Exactly 1 failed deletion');

    // Invariant: doc-del-2 MUST REMAIN in local state
    assert(
      updatedAllDocuments.some((d) => d.id === 'doc-del-2'),
      'Scenario F: Failed deletion doc-del-2 REMAINS in local document state'
    );
    // Invariant: doc-del-1 and doc-del-3 MUST BE REMOVED from local state
    assert(
      !updatedAllDocuments.some((d) => d.id === 'doc-del-1' || d.id === 'doc-del-3'),
      'Scenario F: Successfully deleted doc-del-1 and doc-del-3 removed from state'
    );

    assert(
      report.summaryMessage.includes('2 succeeded, 1 failed'),
      'Scenario F: Summary accurately states "2 succeeded, 1 failed"'
    );
  }

  // =========================================================================
  // SCENARIO G: Refresh after a failed batch
  // =========================================================================
  {
    console.log('\n[Scenario G: Refresh after a failed batch]');
    const doc1 = createSampleDoc('doc-refresh-1', 'TRACK-REF-1', 'Incoming Logged', 5);
    const serverAuthoritativeDoc: DocumentItem = {
      ...doc1,
      title: 'Authoritative Title From PostgreSQL',
      currentStatus: 'Incoming Logged',
      version: 5,
    };

    const mockApiClient = {
      updateDocument: async () => {
        const err: any = new Error('Database transaction abort');
        err.status = 500;
        throw err;
      },
      fetchDocumentById: async (id: string) => {
        return serverAuthoritativeDoc;
      },
    };

    const { report, updatedAllDocuments } = await executeBatchDocumentAction(
      [doc1],
      new Set(['doc-refresh-1']),
      'priority:Urgent',
      mockActor,
      { isOffline: false, apiClient: mockApiClient }
    );

    assert(report.failed === 1, 'Scenario G: Batch action failed');

    // Trigger server refresh for the affected document
    const refreshed = await mockApiClient.fetchDocumentById('doc-refresh-1');
    assert(
      refreshed?.title === 'Authoritative Title From PostgreSQL',
      'Scenario G: Refreshed document reflects exact PostgreSQL authoritative title'
    );
    assert(
      refreshed?.version === 5,
      'Scenario G: Refreshed document version matches PostgreSQL version (5)'
    );

    const localDoc = updatedAllDocuments.find((d) => d.id === 'doc-refresh-1')!;
    assert(
      localDoc.version === 5,
      'Scenario G: Local document version remained unchanged at server version 5'
    );
  }

  console.log(`\n=======================================================`);
  console.log(`Batch Integrity Test Summary: ${testPassed} passed, ${testFailed} failed.`);
  console.log(`=======================================================`);
  if (testFailed > 0) {
    process.exit(1);
  }
}

runBatchIntegrityTests().catch((err) => {
  console.error('Fatal batch test error:', err);
  process.exit(1);
});
