import { DocumentItem } from '../types';
import {
  ALL_DOCUMENT_STATUSES,
  generateEntityId,
  hasUncompliedSupervisorRemarks,
  validateStatusTransition,
  reconcileDocumentIntegrity,
  recordDocumentMovement,
  addSupervisorRemark,
  fulfillSupervisorCompliance,
  applyManagerClearance,
  forwardDocumentToDivision,
  updateDocumentPriority,
  executeBatchAction,
  validateConcurrency,
  WorkflowActor,
} from './workflow';

// Helper to create a pristine test document
function createTestDocument(overrides?: Partial<DocumentItem>): DocumentItem {
  return {
    id: generateEntityId('doc'),
    trackingNumber: 'POSSD-2026-03-0001',
    title: 'Memorandum of Agreement',
    direction: 'Incoming',
    documentType: 'Simple Transaction',
    communicationType: 'Official Memorandum',
    reportType: 'General Report',
    originDepartment: 'Administrative Services',
    dateReceived: '2026-03-14',
    timeReceived: '09:00:00',
    targetDivision: 'CMED',
    responsiblePerson: 'Action Officer',
    priority: 'Routine',
    currentStatus: 'Incoming Logged',
    currentLocation: 'Receiving Desk',
    currentCustodian: 'Receiving Clerk',
    movements: [],
    supervisorRemarks: [],
    managerClearance: { isCleared: false },
    version: 1,
    createdAt: '2026-03-14T01:00:00.000Z',
    updatedAt: '2026-03-14T01:00:00.000Z',
    ...overrides,
  };
}

const mockActor: WorkflowActor = {
  id: 'user-1',
  name: 'Maria Santos',
  role: 'Staff',
  division: 'CMED',
};

const supervisorActor: WorkflowActor = {
  id: 'user-2',
  name: 'Roberto Reyes',
  role: 'Supervisor',
  division: 'CMED',
};

const managerActor: WorkflowActor = {
  id: 'user-3',
  name: 'Elena Cruz',
  role: 'Division Manager',
  division: 'CMED',
};

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: any) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${testName}`, detail || '');
    throw new Error(`Test failed: ${testName}`);
  } else {
    passedTests++;
    console.log(`✅ PASS: ${testName}`);
  }
}

// ==========================================
// TEST SUITE: POSSD Document Workflow Engine
// ==========================================

console.log('\n--- POSSD Document Workflow Engine Unit Tests ---');

// 1. ID Generation Tests
{
  const id1 = generateEntityId('doc');
  const id2 = generateEntityId('mov');
  const id3 = generateEntityId('rem');
  assert(id1.startsWith('doc-') && id1.length > 8, 'generateEntityId generates unique doc prefix');
  assert(id2.startsWith('mov-') && id2 !== id1, 'generateEntityId generates unique mov prefix');
  assert(id3.startsWith('rem-') && id3 !== id2, 'generateEntityId generates unique rem prefix');
}

// 2. Initial Movement and Forwarding Tests
{
  const initialDoc = createTestDocument();
  const res = recordDocumentMovement(
    initialDoc,
    { fromDesk: 'Receiving Desk', toDesk: 'CMED Action Desk', notes: 'Initial delivery' },
    mockActor
  );

  assert(res.success === true, 'recordDocumentMovement succeeds');
  assert(res.document.currentLocation === 'CMED Action Desk', 'currentLocation updated to destination');
  assert(res.document.currentStatus === 'Under Review', 'Incoming Logged automatically moves to Under Review upon first desk movement');
  assert(res.document.movements.length === 1, 'Movement history appended');
  assert(res.document.movements[0].personnelName === mockActor.name, 'Movement preserves actor name');
  assert(res.document.version === 2, 'Version incremented on movement');
}

// 3. Supervisor Remarks and Compliance Flow
{
  const doc = createTestDocument({ currentStatus: 'Under Review' });
  
  // Add directive requiring compliance
  const remarkRes = addSupervisorRemark(
    doc,
    { remarkText: 'Please attach verified quotation forms.', complianceRequired: true },
    supervisorActor
  );

  assert(remarkRes.success === true, 'addSupervisorRemark succeeds');
  assert(remarkRes.document.currentStatus === 'Supervisor Comment Needed', 'Status moves to Supervisor Comment Needed when complianceRequired is true');
  assert(hasUncompliedSupervisorRemarks(remarkRes.document) === true, 'hasUncompliedSupervisorRemarks returns true');
  assert(remarkRes.document.supervisorRemarks.length === 1, 'Supervisor remark recorded');
  assert(remarkRes.document.movements.length === 1, 'Audit movement recorded for supervisor directive');

  const remarkId = remarkRes.document.supervisorRemarks[0].id;

  // Fulfill compliance
  const compRes = fulfillSupervisorCompliance(
    remarkRes.document,
    remarkId,
    'Quotation attached and certified.',
    mockActor
  );

  assert(compRes.success === true, 'fulfillSupervisorCompliance succeeds');
  assert(compRes.document.currentStatus === 'Complied / Ready for Clearance', 'Status transitions to Complied / Ready for Clearance once all remarks fulfilled');
  assert(hasUncompliedSupervisorRemarks(compRes.document) === false, 'hasUncompliedSupervisorRemarks returns false after compliance');
  assert(compRes.document.supervisorRemarks[0].complied === true, 'Remark marked complied');
  assert(compRes.document.movements.length === 2, 'Audit movement recorded for compliance fulfillment');
}

// 4. Invalid Clearance / Transition Rejections
{
  // Try to clear a document that still has uncomplied supervisor remarks
  const blockedDoc = createTestDocument({
    currentStatus: 'Supervisor Comment Needed',
    supervisorRemarks: [
      {
        id: 'rem-1',
        supervisorName: 'Supervisor',
        timestamp: new Date().toISOString(),
        remarkText: 'Must revise signature page',
        complianceRequired: true,
        complied: false,
      },
    ],
  });

  const clearAttempt = applyManagerClearance(
    blockedDoc,
    { clearanceType: 'approved_for_dispatch', clearanceRemarks: 'Approved' },
    managerActor
  );

  assert(clearAttempt.success === false, 'Cannot apply Manager Clearance when uncomplied supervisor remarks exist');
  assert(clearAttempt.error?.includes('Uncomplied supervisor directives'), 'Clear error message returned for uncomplied directive blockage');
}

// 5. Manager Clearance (Approved for Dispatch)
{
  const readyDoc = createTestDocument({ currentStatus: 'Complied / Ready for Clearance' });
  const clearRes = applyManagerClearance(
    readyDoc,
    {
      clearanceType: 'approved_for_dispatch',
      clearanceRemarks: 'All requirements verified.',
    },
    managerActor
  );

  assert(clearRes.success === true, 'applyManagerClearance succeeds for ready document');
  assert(clearRes.document.currentStatus === 'Cleared for Out', 'Status transitions to Cleared for Out');
  assert(clearRes.document.direction === 'Outgoing', 'Direction updated to Outgoing');
  assert(clearRes.document.managerClearance.isCleared === true, 'managerClearance.isCleared is true');
  assert(clearRes.document.movements.length === 1, 'Clearance movement recorded');
  assert(clearRes.document.currentLocation === 'Dispatch / Outbox Desk', 'Location set to Dispatch / Outbox Desk');
}

// 6. Final Dispatched / Completed and Terminal State Guard
{
  const clearedDoc = createTestDocument({
    currentStatus: 'Cleared for Out',
    direction: 'Outgoing',
    managerClearance: { isCleared: true },
  });

  const dispatchRes = applyManagerClearance(
    clearedDoc,
    {
      clearanceType: 'archived_completed',
      forwardedToExternal: 'Department of Budget and Management',
      clearanceRemarks: 'Handed over to courier',
    },
    managerActor
  );

  assert(dispatchRes.success === true, 'archived_completed clearance succeeds');
  assert(dispatchRes.document.currentStatus === 'Dispatched / Completed', 'Status transitions to Dispatched / Completed');

  // Attempting movement on completed document should be rejected
  const moveAttempt = recordDocumentMovement(
    dispatchRes.document,
    { fromDesk: 'Dispatch Desk', toDesk: 'Action Desk' },
    mockActor
  );
  assert(moveAttempt.success === false, 'Movement rejected on Dispatched / Completed document');
}

// 7. Batch Actions Consistency & Rejection Rules
{
  const doc1 = createTestDocument({ id: 'doc-1', trackingNumber: 'POSSD-2026-03-0001', currentStatus: 'Under Review' });
  const doc2 = createTestDocument({
    id: 'doc-2',
    trackingNumber: 'POSSD-2026-03-0002',
    currentStatus: 'Supervisor Comment Needed',
    supervisorRemarks: [
      {
        id: 'rem-uncomplied',
        supervisorName: 'Supervisor',
        timestamp: new Date().toISOString(),
        remarkText: 'Budget allotment pending',
        complianceRequired: true,
        complied: false,
      },
    ],
  });

  // Batch action: Clear Out
  const batchRes = executeBatchAction([doc1, doc2], 'clear_out', managerActor);

  assert(batchRes.totalProcessed === 2, 'Batch processes all documents');
  assert(batchRes.succeeded === 1, 'Batch cleared 1 valid document');
  assert(batchRes.failed === 1, 'Batch rejected 1 invalid document');
  assert(batchRes.errors.length === 1, 'Batch error record provided');
  assert(batchRes.errors[0].trackingNumber === 'POSSD-2026-03-0002', 'Error identifies rejected document tracking number');
  assert(batchRes.updatedDocuments[0].currentStatus === 'Cleared for Out', 'Valid doc status updated in batch output');
  assert(batchRes.updatedDocuments[1].currentStatus === 'Supervisor Comment Needed', 'Rejected doc remains untouched');
}

// 8. Document Integrity Reconciliation
{
  const corruptedRaw = {
    trackingNumber: 'POSSD-2026-03-9999',
    currentStatus: 'Cleared for Out',
    direction: 'Incoming', // Contradictory!
    movements: [{ personnelName: 'Clerk' }], // Missing id and timestamp
  };

  const clean = reconcileDocumentIntegrity(corruptedRaw);
  assert(Boolean(clean.direction === 'Outgoing'), 'Contradictory direction resolved to Outgoing for Cleared for Out status');
  assert(Boolean(clean.id && clean.id.length > 0), 'Clean ID generated');
  assert(Boolean(clean.movements[0].id && clean.movements[0].timestamp), 'Movement IDs and timestamps guaranteed');
}

// 9. Concurrency Conflict Validation
{
  const v1 = createTestDocument({ version: 2 });
  const v2Stale = createTestDocument({ version: 1 });
  const check = validateConcurrency(v1, v2Stale);
  assert(check.hasConflict === true, 'validateConcurrency flags stale client version');

  const v2Fresh = createTestDocument({ version: 2 });
  const checkFresh = validateConcurrency(v1, v2Fresh);
  assert(checkFresh.hasConflict === false, 'validateConcurrency allows matching version');
}

console.log(`\n🎉 All ${passedTests}/${totalTests} tests passed successfully!\n`);
