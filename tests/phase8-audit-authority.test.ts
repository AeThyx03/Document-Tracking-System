import assert from 'node:assert/strict';
import { compileDocumentAuditTrail, recordGlobalAudit, createAuditEvent } from '../src/lib/audit.ts';
import { DocumentItem } from '../src/types.ts';

console.log('--- POSSD Phase 8: Audit Authority & Integrity Verification Tests ---');

let passedTests = 0;
function pass(message: string) {
  console.log(`✅ PASS: ${message}`);
  passedTests++;
}

async function runPhase8Tests() {
  const mockDoc: DocumentItem = {
    id: 'DOC-8001',
    trackingNumber: 'POSSD-2026-08001',
    title: 'Phase 8 Audit Test Document',
    documentType: 'MEMORANDUM',
    communicationType: 'INTERNAL',
    reportType: 'TECHNICAL_REPORT',
    direction: 'Incoming',
    originDepartment: 'IT Division',
    targetDivision: 'Operations',
    currentLocation: 'Manager Desk',
    currentCustodian: 'Division Manager',
    currentStatus: 'Under Review',
    priority: 'Routine',
    dateReceived: '2026-09-15',
    timeReceived: '09:00 AM',
    responsiblePerson: 'Custodian John',
    createdAt: '2026-09-15T09:00:00Z',
    updatedAt: '2026-09-15T11:00:00Z',
    movements: [
      {
        id: 'MOV-801',
        timestamp: '2026-09-15T09:30:00Z',
        currentDesk: 'Receiving Desk',
        forwardToDesk: 'Manager Desk',
        personnelName: 'Officer Alice',
        personnelRole: 'Handling Staff',
        statusUpdate: 'forwarded',
        notes: 'Transferred for managerial review',
      },
    ],
    supervisorRemarks: [
      {
        id: 'REM-801',
        timestamp: '2026-09-15T10:00:00Z',
        supervisorName: 'Supervisor Bob',
        remarkText: 'Please verify compliance matrix',
        complianceRequired: true,
        complied: true,
        compliedAt: '2026-09-15T10:15:00Z',
        compliedBy: 'Staff Charlie',
        complianceNotes: 'Compliance matrix verified',
      },
    ],
    managerClearance: {
      isCleared: false,
      clearedAt: '2026-09-15T10:30:00Z',
      clearedBy: 'Manager Dave',
      clearanceType: 'returned_for_revision',
      clearanceRemarks: 'Returned for revision due to missing section B',
    },
  };

  // Test 1: Historical clearance preservation
  const events = compileDocumentAuditTrail(mockDoc, 'asc');
  assert.ok(events.length >= 4, 'Audit trail must compile all historical events');
  const clearanceGranted = events.find((e) => e.action === 'CLEARANCE_GRANTED');
  assert.ok(clearanceGranted, 'CLEARANCE_GRANTED event must exist');
  assert.strictEqual(clearanceGranted?.actorName, 'Manager Dave');
  const clearanceRevoked = events.find((e) => e.action === 'REVOKE_CLEARANCE');
  assert.ok(clearanceRevoked, 'REVOKE_CLEARANCE event must exist');
  assert.ok(clearanceRevoked?.notes?.includes('Returned for revision'));
  pass('1. Historical clearance and revocation events preserved even after clearance status changed');

  // Test 2: Global audit event merging
  const globalEv = createAuditEvent({
    documentId: 'DOC-8001',
    trackingNumber: 'POSSD-2026-08001',
    action: 'STATUS_CHANGED',
    actionTitle: 'Custom Operational Event',
    stageLabel: 'Special Review',
    type: 'system',
    actor: { name: 'Auditor Eve', role: 'Inspector' },
    notes: 'Special audit inspection conducted',
  });
  recordGlobalAudit(globalEv);

  const mergedEvents = compileDocumentAuditTrail(mockDoc, 'asc');
  const matchedCustom = mergedEvents.find((e) => e.actionTitle === 'Custom Operational Event');
  assert.ok(matchedCustom, 'Global audit event must be merged into document audit trail');
  assert.strictEqual(matchedCustom?.actorName, 'Auditor Eve');
  pass('2. Global audit records merged smoothly into compiled audit trail');

  // Test 3: Ordering authority
  const ascEvents = compileDocumentAuditTrail(mockDoc, 'asc');
  for (let i = 0; i < ascEvents.length - 1; i++) {
    const timeA = new Date(ascEvents[i].timestamp).getTime();
    const timeB = new Date(ascEvents[i + 1].timestamp).getTime();
    assert.ok(timeA <= timeB, 'ASC order must be chronological');
  }
  pass('3. Chronological sorting order strictly maintained');

  console.log(`🎉 All ${passedTests} Phase 8 tests passed successfully!`);
}

runPhase8Tests().catch((err) => {
  console.error('❌ Phase 8 test failure:', err);
  process.exit(1);
});
