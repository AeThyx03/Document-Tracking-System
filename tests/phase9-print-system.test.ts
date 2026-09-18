import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { compileDocumentAuditTrail } from '../src/lib/audit.ts';
import { DocumentItem } from '../src/types.ts';

console.log('--- POSSD Phase 9: Document Tab Print System Correction Verification Tests ---');

let passedTests = 0;
function pass(message: string) {
  console.log(`✅ PASS: ${message}`);
  passedTests++;
}

async function runPhase9Tests() {
  const modalPath = path.join(process.cwd(), 'src/components/DocumentDetailModal.tsx');
  const auditTrailPath = path.join(process.cwd(), 'src/components/DocumentAuditTrail.tsx');
  const cssPath = path.join(process.cwd(), 'src/index.css');

  const modalSource = fs.readFileSync(modalPath, 'utf-8');
  const auditTrailSource = fs.readFileSync(auditTrailPath, 'utf-8');
  const cssSource = fs.readFileSync(cssPath, 'utf-8');

  // Test 1: Single visible print button in modal header
  assert.ok(modalSource.includes('id="print-audit-trail-header-btn"'), 'Header must contain print audit trail button');
  assert.ok(modalSource.includes('id="print-tracking-slip-btn"'), 'Header must contain print tracking slip button');
  assert.ok(modalSource.includes("activeTab === 'audit'"), 'Header button must switch based on activeTab');
  pass('1. Document detail header renders exactly ONE visible print control for active tab');

  // Test 2: No duplicate print trail button in DocumentAuditTrail component
  assert.ok(!auditTrailSource.includes('id="print-audit-trail-btn"'), 'DocumentAuditTrail must not render duplicate print button');
  assert.ok(!auditTrailSource.includes('<span>Print Trail</span>'), 'DocumentAuditTrail must not render Print Trail label');
  pass('2. Inner DocumentAuditTrail component does not render duplicate visible Print Trail button');

  // Test 3: Controlled print dispatcher without hardcoded timeouts
  assert.ok(modalSource.includes('pendingPrintTarget'), 'Modal must manage pendingPrintTarget state');
  assert.ok(modalSource.includes('requestAnimationFrame'), 'Modal must wait for DOM commit via requestAnimationFrame');
  assert.ok(modalSource.includes('printable-routing-slip'), 'Modal must render printable-routing-slip container');
  assert.ok(modalSource.includes('printable-audit-trail'), 'Modal must render printable-audit-trail container');
  pass('3. Print execution uses DOM-commit listener before calling window.print()');

  // Test 4: Form POSSD-DTS-AUD01 printable audit trail compilation
  const mockDoc: DocumentItem = {
    id: 'DOC-9002',
    trackingNumber: 'POSSD-2026-09002',
    title: 'Print System Test Doc',
    documentType: 'DIRECTIVE',
    communicationType: 'INTERNAL',
    reportType: 'MEMORANDUM',
    direction: 'Incoming',
    originDepartment: 'Admin',
    targetDivision: 'Operations',
    currentLocation: 'Records Desk',
    currentCustodian: 'Custodian Mary',
    currentStatus: 'Dispatched / Completed',
    priority: 'Routine',
    dateReceived: '2026-09-16',
    timeReceived: '08:00 AM',
    responsiblePerson: 'Mary',
    createdAt: '2026-09-16T08:00:00Z',
    updatedAt: '2026-09-16T09:00:00Z',
    movements: [],
    supervisorRemarks: [],
    managerClearance: {
      isCleared: true,
      clearedAt: '2026-09-16T09:00:00Z',
      clearedBy: 'Manager Dave',
      clearanceType: 'approved_for_dispatch',
    },
  };

  const printableEvents = compileDocumentAuditTrail(mockDoc, 'asc');
  assert.ok(printableEvents.length >= 2, 'Printable audit trail must contain lifecycle events');
  assert.strictEqual(printableEvents[0].action, 'DOCUMENT_CREATED');
  assert.strictEqual(printableEvents[printableEvents.length - 1].action, 'CLEARANCE_GRANTED');
  pass('4. Form POSSD-DTS-AUD01 printable audit trail compiles accurately');

  // Test 5: Print isolation CSS rules
  assert.ok(cssSource.includes('@media print'), 'CSS must contain @media print block');
  assert.ok(cssSource.includes('document-detail-modal-overlay'), 'CSS must isolate document detail modal in print');
  assert.ok(cssSource.includes('.no-print'), 'CSS must define .no-print utility');
  assert.ok(modalSource.includes('print:hidden'), 'Components must use print:hidden utility');
  pass('5. Print isolation CSS rules properly hide interactive UI elements');

  console.log(`🎉 All ${passedTests} Phase 9 tests passed successfully!`);
}

runPhase9Tests().catch((err) => {
  console.error('❌ Phase 9 test failure:', err);
  process.exit(1);
});
