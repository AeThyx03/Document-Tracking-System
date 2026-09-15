import { pool, checkDatabaseConnection, withTransaction } from '../server/db/index.ts';
import { runMigrations } from '../server/migrations/runner.ts';
import {
  createNewDocument,
  getDocumentById,
  updateExistingDocument,
  deleteDocumentById,
  routeDocumentWithTransaction,
  addDocumentRemark,
  DocumentConflictError,
} from '../server/services/documentService.ts';
import { db } from '../server/db/index.ts';
import { documents, documentMovements, auditLogs } from '../server/db/schema.ts';
import { eq } from 'drizzle-orm';

interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function recordResult(name: string, passed: boolean, message: string, details?: any) {
  results.push({ testName: name, passed, message, details });
  const symbol = passed ? '✅' : '❌';
  console.log(`${symbol} [${name}]: ${message}`);
  if (details && !passed) {
    console.error('   Details:', details);
  }
}

async function runTests() {
  console.log('===============================================================');
  console.log('POSSD PHASE 0-1: COMPREHENSIVE BACKEND & DATABASE TEST SUITE');
  console.log('===============================================================\n');

  // Test 1: Database Connection
  try {
    const res = await pool.query('SELECT NOW() as now, version() as version');
    recordResult('Database Connection', true, `Connected to ${res.rows[0].version.split(' ')[0]} at ${res.rows[0].now}`);
  } catch (err: any) {
    recordResult('Database Connection', false, err.message, err);
  }

  // Test 2: Migration Execution
  try {
    const migRes = await runMigrations();
    const appliedCheck = await pool.query('SELECT name, applied_at FROM _migrations ORDER BY id');
    recordResult(
      'Migration Execution',
      migRes.success,
      `Migrations verified. Applied files: ${appliedCheck.rows.map((r) => r.name).join(', ')}`
    );
  } catch (err: any) {
    recordResult('Migration Execution', false, err.message, err);
  }

  // Test 3: Health Probe
  try {
    const health = await checkDatabaseConnection();
    recordResult('Health Endpoint Probe', health.ok, `Database probe healthy (latency: ${health.latencyMs}ms)`);
  } catch (err: any) {
    recordResult('Health Endpoint Probe', false, err.message, err);
  }

  const testDocId = `test_doc_${Date.now()}`;
  const testTrk = `TRK-TEST-${Math.floor(1000 + Math.random() * 9000)}`;

  // Test 4: Document INSERT
  try {
    const created = await createNewDocument({
      id: testDocId,
      trackingNumber: testTrk,
      title: 'Automated Test Document - Port Concession Agreement',
      direction: 'Incoming',
      documentType: 'Legal Contract',
      communicationType: 'Official Endorsement',
      reportType: 'N/A',
      originDepartment: 'Legal Affairs Section',
      dateReceived: '2026-09-14',
      timeReceived: '09:00:00',
      targetDivision: 'Legal & Regulatory Affairs',
      responsiblePerson: 'Atty. Maria Santos',
      priority: 'Urgent',
      currentStatus: 'Received',
      currentLocation: 'Central Receiving Desk',
      currentCustodian: 'Receiving Officer',
    });
    recordResult('Document INSERT', !!created && created.version === 1, `Document inserted (ID: ${created.id}, Tracking: ${created.trackingNumber}, Version: ${created.version})`);
  } catch (err: any) {
    recordResult('Document INSERT', false, err.message, err);
  }

  // Test 5: Document SELECT
  try {
    const fetched = await getDocumentById(testDocId);
    recordResult('Document SELECT', fetched.id === testDocId && fetched.trackingNumber === testTrk, `Fetched document successfully: "${fetched.title}"`);
  } catch (err: any) {
    recordResult('Document SELECT', false, err.message, err);
  }

  // Test 6: Document UPDATE (Optimistic Concurrency)
  try {
    const updated = await updateExistingDocument(
      testDocId,
      {
        currentStatus: 'Under Review',
        priority: 'Rush',
      },
      1 // client expected version 1
    );
    recordResult(
      'Document UPDATE (Optimistic Concurrency)',
      updated.version === 2 && updated.currentStatus === 'Under Review',
      `Document updated safely. Version transitioned from 1 -> ${updated.version}`
    );
  } catch (err: any) {
    recordResult('Document UPDATE (Optimistic Concurrency)', false, err.message, err);
  }

  // Test 7: Version Conflict Detection (HTTP 409 simulation)
  try {
    // Attempting to update with stale version 1 when version is now 2
    await updateExistingDocument(
      testDocId,
      { currentStatus: 'Conflict Stale Update' },
      1 // Stale version!
    );
    recordResult('Version Conflict Detection', false, 'Expected DocumentConflictError, but update succeeded unexpectedly.');
  } catch (err: any) {
    if (err instanceof DocumentConflictError || err.name === 'DocumentConflictError') {
      recordResult('Version Conflict Detection', true, `Version conflict properly blocked stale update: ${err.message}`);
    } else {
      recordResult('Version Conflict Detection', false, `Unexpected error: ${err.message}`);
    }
  }

  // Test 8: Document Movement (Transactional Routing)
  try {
    const routeRes = await routeDocumentWithTransaction(testDocId, {
      personnelName: 'Officer Juan Dela Cruz',
      personnelRole: 'Receiving',
      currentDesk: 'Central Receiving Desk',
      forwardToDesk: 'Legal Review Desk',
      statusUpdate: 'Forwarded for Legal Review',
      notes: 'Urgent contract review requested by Division Head',
      toDepartment: 'Legal Affairs Section',
    });
    recordResult(
      'Document Movement (Transactional Routing)',
      routeRes.document.version === 3 && routeRes.document.currentLocation === 'Legal Review Desk',
      `Routing transaction committed atomically. Version is now ${routeRes.document.version}, Desk: "${routeRes.document.currentLocation}"`
    );
  } catch (err: any) {
    recordResult('Document Movement (Transactional Routing)', false, err.message, err);
  }

  // Test 9: Supervisor Remark INSERT
  try {
    const remark = await addDocumentRemark(testDocId, {
      supervisorName: 'Supervisor Ramon Gomez',
      remarkText: 'Please verify compliance with PPA memo circular 2026-04.',
      complianceRequired: true,
      complianceNotes: 'Check article IV section 2',
    });
    recordResult('Remark INSERT', !!remark && remark.supervisorName === 'Supervisor Ramon Gomez', `Supervisor remark attached with compliance requirement.`);
  } catch (err: any) {
    recordResult('Remark INSERT', false, err.message, err);
  }

  // Test 10: Audit Log Verification
  try {
    const logs = await db.select().from(auditLogs).where(eq(auditLogs.entityId, testDocId));
    recordResult('Audit Log Recording', logs.length >= 3, `Audit trail confirmed: ${logs.length} operations recorded for ${testDocId}`);
  } catch (err: any) {
    recordResult('Audit Log Recording', false, err.message, err);
  }

  // Test 11: Foreign-Key Constraint Enforcement
  try {
    await pool.query(
      `INSERT INTO document_movements (id, document_id, timestamp, personnel_name, current_desk, forward_to_desk, status_update)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['mov_invalid_fk', 'non_existent_doc_id_99999', new Date(), 'Fake Person', 'Desk A', 'Desk B', 'Moved']
    );
    recordResult('Foreign-Key Enforcement', false, 'FK violation was expected, but insert succeeded unexpectedly.');
  } catch (err: any) {
    // 23503 is postgres foreign_key_violation error code
    const isFkViolation = err.code === '23503' || err.message.includes('foreign key constraint');
    recordResult('Foreign-Key Enforcement', isFkViolation, `FK constraint successfully prevented orphan movement record (Error code: ${err.code})`);
  }

  // Test 12: Transaction Rollback Verification
  const rollbackDocId = `rollback_doc_${Date.now()}`;
  try {
    await withTransaction(async (tx) => {
      // 1. Insert doc inside tx
      await tx.insert(documents).values({
        id: rollbackDocId,
        trackingNumber: `ROLLBACK-TRK-${Date.now()}`,
        title: 'Document that must be rolled back',
        documentType: 'Test',
        communicationType: 'Test',
        reportType: 'Test',
        originDepartment: 'Test',
        dateReceived: '2026-09-14',
        timeReceived: '12:00:00',
        targetDivision: 'Test',
        responsiblePerson: 'Test',
        currentStatus: 'Test',
        currentLocation: 'Test',
        currentCustodian: 'Test',
      });
      // 2. Deliberately throw an error to trigger ROLLBACK
      throw new Error('SIMULATED_TRANSACTION_FAILURE');
    });
  } catch (err: any) {
    // Expected to fail with our simulated error
    const check = await db.select().from(documents).where(eq(documents.id, rollbackDocId));
    const wasRolledBack = check.length === 0;
    recordResult('Transaction Rollback', wasRolledBack, `Atomic transaction rollback verified. Zero records persisted after error.`);
  }

  // Test 13: Document DELETE (Cascade Cleanup)
  try {
    await deleteDocumentById(testDocId);
    const checkDoc = await db.select().from(documents).where(eq(documents.id, testDocId));
    const checkMov = await db.select().from(documentMovements).where(eq(documentMovements.documentId, testDocId));
    const cascadesCleaned = checkDoc.length === 0 && checkMov.length === 0;
    recordResult('Document DELETE & Cascade Cleanup', cascadesCleaned, `Document and associated child movements deleted cleanly.`);
  } catch (err: any) {
    recordResult('Document DELETE & Cascade Cleanup', false, err.message, err);
  }

  console.log('\n===============================================================');
  const allPassed = results.every((r) => r.passed);
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${results.filter((r) => r.passed).length} | FAILED: ${results.filter((r) => !r.passed).length}`);
  console.log(`OVERALL RESULT: ${allPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
  console.log('===============================================================\n');

  await pool.end();
  process.exit(allPassed ? 0 : 1);
}

runTests().catch((e) => {
  console.error('Fatal test runner exception:', e);
  process.exit(1);
});
