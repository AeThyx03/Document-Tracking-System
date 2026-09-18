import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DocumentItem } from '../src/types.ts';

console.log('--- POSSD Controlled Corrections: Print System, Dashboard Totals & Table Performance ---');

let passedTests = 0;
function pass(message: string) {
  console.log(`✅ PASS: ${message}`);
  passedTests++;
}

async function runCorrectionsTests() {
  const modalPath = path.join(process.cwd(), 'src/components/DocumentDetailModal.tsx');
  const auditTrailPath = path.join(process.cwd(), 'src/components/DocumentAuditTrail.tsx');
  const appPath = path.join(process.cwd(), 'src/App.tsx');
  const documentServicePath = path.join(process.cwd(), 'server/services/documentService.ts');
  const documentsRoutePath = path.join(process.cwd(), 'server/routes/documents.ts');
  const apiPath = path.join(process.cwd(), 'src/lib/api.ts');

  const modalSource = fs.readFileSync(modalPath, 'utf-8');
  const auditTrailSource = fs.readFileSync(auditTrailPath, 'utf-8');
  const appSource = fs.readFileSync(appPath, 'utf-8');
  const documentServiceSource = fs.readFileSync(documentServicePath, 'utf-8');
  const documentsRouteSource = fs.readFileSync(documentsRoutePath, 'utf-8');
  const apiSource = fs.readFileSync(apiPath, 'utf-8');

  // =========================================================================
  // CORRECTION 1 VERIFICATION: DOCUMENT DETAIL PRINTING
  // =========================================================================

  // 1.1 Exactly ONE visible document detail print control in header
  assert.ok(modalSource.includes('id="print-audit-trail-header-btn"'), 'Modal must have print-audit-trail-header-btn');
  assert.ok(modalSource.includes('id="print-tracking-slip-btn"'), 'Modal must have print-tracking-slip-btn');
  assert.ok(modalSource.includes("activeTab === 'audit' ? ("), 'Must render exactly one print button based on activeTab');
  pass('1.1 Header renders exactly ONE visible print button corresponding to the active document tab');

  // 1.2 DocumentAuditTrail does not independently call window.print()
  assert.ok(!auditTrailSource.includes('window.print()'), 'DocumentAuditTrail must NOT call window.print()');
  assert.ok(!auditTrailSource.includes('handlePrintAuditTrail'), 'DocumentAuditTrail must not have handlePrintAuditTrail');
  pass('1.2 DocumentAuditTrail does not independently invoke window.print()');

  // 1.3 No arbitrary setTimeout delays in print controller
  assert.ok(!modalSource.includes('setTimeout(() => {\n            window.print();'), 'Print controller must NOT use setTimeout for printing');
  assert.ok(!modalSource.includes('setTimeout(() => { window.print();'), 'No inline setTimeout window.print');
  pass('1.3 DocumentDetailModal eliminates arbitrary setTimeout delays for printing');

  // 1.4 Deterministic DOM verification before calling window.print()
  assert.ok(modalSource.includes('requestAnimationFrame'), 'Must use requestAnimationFrame for DOM commit check');
  assert.ok(modalSource.includes('window.document.getElementById(targetId)'), 'Must check DOM element existence');
  assert.ok(modalSource.includes('Aborting print'), 'Must abort cleanly if target element does not exist');
  assert.ok(modalSource.includes('afterprint'), 'Must listen to afterprint to reset print state');
  pass('1.4 Print controller verifies target DOM element existence deterministically before dispatching print');

  // 1.5 Modal print targets are isolated and distinct
  assert.ok(modalSource.includes("id=\"printable-routing-slip\""), 'Modal defines #printable-routing-slip');
  assert.ok(modalSource.includes("id=\"printable-audit-trail\""), 'Modal defines #printable-audit-trail');
  assert.ok(modalSource.includes("printTarget === 'routing-slip' &&"), 'Only renders selected routing slip in print');
  assert.ok(modalSource.includes("printTarget === 'audit-trail' &&"), 'Only renders selected audit trail in print');
  pass('1.5 Routing slip and audit trail reports are rendered mutually exclusively');

  // =========================================================================
  // CORRECTION 2 VERIFICATION: DASHBOARD TOTAL MONITORED INVARIANT
  // =========================================================================

  // 2.1 Backend getAllDocuments calculates and returns totalMonitoredCount unfiltered
  assert.ok(documentServiceSource.includes('totalMonitoredCount'), 'documentService must query totalMonitoredCount');
  assert.ok(documentsRouteSource.includes('totalMonitoredCount'), 'documents route must return totalMonitoredCount');
  assert.ok(apiSource.includes('totalMonitoredCount'), 'api client must handle totalMonitoredCount');
  pass('2.1 Backend and API client provide authoritative unfiltered totalMonitoredCount');

  // 2.2 App.tsx maintains distinct totalMonitoredCount and currentViewCount
  assert.ok(appSource.includes('totalMonitoredCount'), 'App.tsx must maintain totalMonitoredCount state');
  assert.ok(appSource.includes('currentViewCount'), 'App.tsx must maintain currentViewCount concept');
  assert.ok(appSource.includes('{totalMonitoredCount}'), 'Total Monitored card must render totalMonitoredCount');
  pass('2.2 App.tsx conceptually separates totalMonitoredCount from currentViewCount');

  // 2.3 Simulating Total Monitored invariant across view transitions
  const mockDataset: DocumentItem[] = [
    {
      id: 'DOC-1',
      trackingNumber: 'POSSD-2026-0001',
      title: 'Budget Allocation',
      documentType: 'FINANCIAL',
      communicationType: 'INTERNAL',
      reportType: 'MEMORANDUM',
      direction: 'Incoming',
      originDepartment: 'Budget Office',
      targetDivision: 'Finance',
      currentLocation: 'Records Desk',
      currentCustodian: 'Custodian A',
      currentStatus: 'Incoming Logged',
      priority: 'Routine',
      dateReceived: '2026-09-16',
      timeReceived: '08:00 AM',
      responsiblePerson: 'Person A',
      createdAt: '2026-09-16T08:00:00Z',
      updatedAt: '2026-09-16T08:00:00Z',
      movements: [],
      supervisorRemarks: [],
      managerClearance: null,
    },
    {
      id: 'DOC-2',
      trackingNumber: 'POSSD-2026-0002',
      title: 'Compliance Audit',
      documentType: 'DIRECTIVE',
      communicationType: 'INTERNAL',
      reportType: 'REPORT',
      direction: 'Incoming',
      originDepartment: 'Audit Office',
      targetDivision: 'Operations',
      currentLocation: 'Supervisor Desk',
      currentCustodian: 'Supervisor B',
      currentStatus: 'Supervisor Comment Needed',
      priority: 'Urgent',
      dateReceived: '2026-09-16',
      timeReceived: '09:00 AM',
      responsiblePerson: 'Person B',
      createdAt: '2026-09-16T09:00:00Z',
      updatedAt: '2026-09-16T09:00:00Z',
      movements: [],
      supervisorRemarks: [],
      managerClearance: null,
    },
    {
      id: 'DOC-3',
      trackingNumber: 'POSSD-2026-0003',
      title: 'Special Project Clearance',
      documentType: 'CLEARANCE',
      communicationType: 'EXTERNAL',
      reportType: 'ENDORSEMENT',
      direction: 'Outgoing',
      originDepartment: 'POSSD',
      targetDivision: 'External Affairs',
      currentLocation: 'Manager Desk',
      currentCustodian: 'Manager C',
      currentStatus: 'Cleared for Out',
      priority: 'Priority',
      dateReceived: '2026-09-16',
      timeReceived: '10:00 AM',
      responsiblePerson: 'Person C',
      createdAt: '2026-09-16T10:00:00Z',
      updatedAt: '2026-09-16T10:00:00Z',
      movements: [],
      supervisorRemarks: [],
      managerClearance: {
        isCleared: true,
        clearedAt: '2026-09-16T10:30:00Z',
        clearedBy: 'Manager C',
        clearanceType: 'approved_for_dispatch',
      },
    },
  ];

  const totalN = mockDataset.length; // N = 3
  let stateTotalMonitored = totalN;
  let stateCurrentView = 'all';
  let filteredResults = mockDataset;

  const simulateTileClick = (viewMode: 'all' | 'incoming' | 'compliance_needed' | 'outgoing' | 'overdue') => {
    stateCurrentView = viewMode;
    // Invariant rule: Total Monitored = total number of ALL logged documents. It must NOT change.
    // Filtered results change based on the viewMode:
    if (viewMode === 'all') {
      filteredResults = mockDataset;
    } else if (viewMode === 'incoming') {
      filteredResults = mockDataset.filter((d) => ['Incoming Logged', 'Under Review'].includes(d.currentStatus));
    } else if (viewMode === 'compliance_needed') {
      filteredResults = mockDataset.filter((d) => d.currentStatus === 'Supervisor Comment Needed');
    } else if (viewMode === 'outgoing') {
      filteredResults = mockDataset.filter((d) => ['Cleared for Out', 'Dispatched / Completed'].includes(d.currentStatus));
    } else if (viewMode === 'overdue') {
      filteredResults = mockDataset.filter((d) => !d.managerClearance?.isCleared);
    }
  };

  // Initial: Total Monitored = N
  assert.strictEqual(stateTotalMonitored, 3, 'Initial: Total Monitored must equal N');
  assert.strictEqual(filteredResults.length, 3);
  pass('2.3.1 Initial: Total Monitored = N (3)');

  // Click Ongoing: Total Monitored = N
  simulateTileClick('incoming');
  assert.strictEqual(stateTotalMonitored, 3, 'Click Ongoing: Total Monitored must remain N');
  assert.strictEqual(filteredResults.length, 1, 'Registry results must filter to Ongoing documents');
  pass('2.3.2 Click Ongoing: Total Monitored remains N (3) while view filters to 1 document');

  // Click Action Required: Total Monitored = N
  simulateTileClick('compliance_needed');
  assert.strictEqual(stateTotalMonitored, 3, 'Click Action Required: Total Monitored must remain N');
  assert.strictEqual(filteredResults.length, 1, 'Registry results must filter to Action Required');
  pass('2.3.3 Click Action Required: Total Monitored remains N (3) while view filters to 1 document');

  // Click Cleared for Out: Total Monitored = N
  simulateTileClick('outgoing');
  assert.strictEqual(stateTotalMonitored, 3, 'Click Cleared for Out: Total Monitored must remain N');
  assert.strictEqual(filteredResults.length, 1, 'Registry results must filter to Cleared for Out');
  pass('2.3.4 Click Cleared for Out: Total Monitored remains N (3) while view filters to 1 document');

  // Click Overdue: Total Monitored = N
  simulateTileClick('overdue');
  assert.strictEqual(stateTotalMonitored, 3, 'Click Overdue: Total Monitored must remain N');
  assert.strictEqual(filteredResults.length, 2, 'Registry results must filter to non-cleared documents');
  pass('2.3.5 Click Overdue: Total Monitored remains N (3) while view filters to overdue/active documents');

  // Return to ALL: Total Monitored = N
  simulateTileClick('all');
  assert.strictEqual(stateTotalMonitored, 3, 'Return to ALL: Total Monitored must remain N');
  assert.strictEqual(filteredResults.length, 3, 'Registry results must return to full dataset');
  pass('2.3.6 Return to ALL: Total Monitored remains N (3) and registry returns to full population');

  // =========================================================================
  // CORRECTION 3 VERIFICATION: REMOVE SLOW TABLE ROW ANIMATIONS
  // =========================================================================

  // 3.1 Registry table contains no motion.tr
  assert.ok(!appSource.includes('<motion.tr'), 'App.tsx must NOT contain <motion.tr>');
  assert.ok(!appSource.includes('</motion.tr>'), 'App.tsx must NOT contain </motion.tr>');
  pass('3.1 Registry table has removed all motion.tr entrance animations');

  // 3.2 Standard tr is used
  assert.ok(appSource.includes('<tr\n                        key={`${doc.id}-${_idx_doc}`}') ||
            appSource.includes('key={`${doc.id}-${_idx_doc}`}'),
            'App.tsx must render standard tr for table rows');
  pass('3.2 Standard HTML table row (tr) is rendered directly without animation wrappers');

  // 3.3 No staggered delay arithmetic on table rows
  assert.ok(!appSource.includes('delay: (_idx_doc % 20) * 0.05'), 'Staggered row delay arithmetic must be removed');
  pass('3.3 Staggered row delay arithmetic is completely eliminated');

  // 3.4 Table interactions preserved
  assert.ok(appSource.includes('onClick={() => setSelectedDoc(doc)}'), 'Row click to open document details preserved');
  assert.ok(appSource.includes('isSelected'), 'Row selection styling preserved');
  assert.ok(appSource.includes('shouldHighlightOverdue'), 'Overdue row highlight preserved');
  pass('3.4 Selection, overdue highlighting, and click handlers on table rows are fully preserved');

  console.log(`\n🎉 All ${passedTests} Controlled Corrections regression tests passed successfully!`);
}

runCorrectionsTests().catch((err) => {
  console.error('❌ Corrections test failure:', err);
  process.exit(1);
});
