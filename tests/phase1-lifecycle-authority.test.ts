import assert from 'node:assert/strict';
import {
  CANONICAL_LIFECYCLE_STATUSES,
  isCanonicalLifecycleStatus,
  validateBackendLifecycleTransition,
  updateExistingDocument,
  routeDocumentWithTransaction,
  addDocumentRemark,
  fulfillDocumentCompliance,
  addDocumentClearance,
  createNewDocument,
  DocumentValidationError,
} from '../server/services/documentService.ts';
import { db } from '../server/db/index.ts';
import { documents, personnel, users } from '../server/db/schema.ts';
import { eq } from 'drizzle-orm';

console.log('--- POSSD Phase 1: Authoritative Document Lifecycle Unit Tests ---');

let passedTests = 0;
function pass(message: string) {
  console.log(`✅ PASS: ${message}`);
  passedTests++;
}

async function runTests() {
  // 1. Canonical Status List Validation
  assert.strictEqual(CANONICAL_LIFECYCLE_STATUSES.length, 7, 'Must have exactly 7 canonical lifecycle statuses');
  assert.ok(isCanonicalLifecycleStatus('Incoming Logged'));
  assert.ok(isCanonicalLifecycleStatus('Assigned'));
  assert.ok(isCanonicalLifecycleStatus('Under Review'));
  assert.ok(isCanonicalLifecycleStatus('Supervisor Comment Needed'));
  assert.ok(isCanonicalLifecycleStatus('Complied / Ready for Clearance'));
  assert.ok(isCanonicalLifecycleStatus('Cleared for Out'));
  assert.ok(isCanonicalLifecycleStatus('Dispatched / Completed'));
  assert.strictEqual(isCanonicalLifecycleStatus('Forwarded for Legal Review'), false, 'Descriptive routing text must NOT be canonical lifecycle status');
  assert.strictEqual(isCanonicalLifecycleStatus('pending_review'), false, 'Random string must NOT be canonical lifecycle status');
  pass('Canonical lifecycle statuses defined and validated correctly');

  // Ensure test users exist in database for actors
  let [testUser] = await db.select().from(users).limit(1);
  if (!testUser) {
    [testUser] = await db.insert(users).values({
      username: 'lifecycle_test_user',
      email: 'lifecycle_user@possd.gov.ph',
      role: 'Staff',
      isActive: true,
    }).returning();
  }

  const staffActor = { id: testUser.id, userId: testUser.id, name: testUser.username, role: 'Staff' };
  const testActor = { id: testUser.id, userId: testUser.id, name: testUser.username, role: testUser.role };
  const adminActor = { id: testUser.id, userId: testUser.id, name: testUser.username, role: 'System Admin' };
  const managerActor = { id: testUser.id, userId: testUser.id, name: testUser.username, role: 'Department Manager' };

  // Ensure active personnel exists for document creation
  let [person] = await db.select().from(personnel).where(eq(personnel.status, 'active')).limit(1);
  if (!person) {
    [person] = await db.insert(personnel).values({
      name: 'Lifecycle Test Focal Person',
      username: 'lifecycle_test_focal',
      email: 'lifecycle_test@possd.gov.ph',
      role: 'Staff',
      division: 'Administrative Services',
      status: 'active',
    }).returning();
  }

  // Create a clean test document
  const testTrackNum = `POSSD-LIFECYCLE-${Date.now()}`;
  const doc = await createNewDocument({
    trackingNumber: testTrackNum,
    title: 'Lifecycle Authority Verification Document',
    documentClassification: 'Incoming',
    transactionType: 'Simple Transaction',
    originDepartment: 'General Records',
    targetDivision: 'Unassigned',
    responsiblePerson: person.name,
    responsiblePersonId: person.id,
    priority: 'Routine',
    currentLocation: 'Receiving Desk',
    currentCustodian: 'Receiving Clerk',
  });

  assert.strictEqual(doc.currentStatus, 'Incoming Logged', 'Initial document status must be Incoming Logged');
  pass('Document initialized with Incoming Logged status');

  // 2. Generic PUT/Update cannot bypass lifecycle validation with non-canonical or invalid status
  await assert.rejects(
    async () => {
      await updateExistingDocument(doc.id, { currentStatus: 'Invalid Non-Canonical Status' }, doc.version, '1', testActor);
    },
    (err: any) => {
      assert.ok(err instanceof DocumentValidationError);
      assert.ok(err.message.includes('Status must be one of the canonical POSSD lifecycle statuses'));
      return true;
    },
    'Non-canonical status update rejected'
  );
  pass('Generic update rejected for non-canonical status value');

  // 3. Movement descriptive status text (e.g. "Forwarded for Legal Review") does NOT overwrite currentStatus
  const routeRes = await routeDocumentWithTransaction(
    doc.id,
    {
      currentDesk: 'Receiving Desk',
      forwardToDesk: 'Legal Division Desk',
      statusUpdate: 'Forwarded for Legal Review',
      notes: 'Initial routing for legal assessment',
    },
    '1',
    testActor
  );

  assert.strictEqual(routeRes.movement.statusUpdate, 'Forwarded for Legal Review', 'Movement record retains descriptive status text');
  assert.strictEqual(routeRes.document.currentStatus, 'Under Review', 'Document lifecycle currentStatus transitions from Incoming Logged to Under Review, ignoring descriptive movement string');
  pass('Movement descriptive status text does not corrupt lifecycle currentStatus');

  // 4. Adding supervisor remark with complianceRequired=true forces status to "Supervisor Comment Needed"
  const rem = await addDocumentRemark(
    doc.id,
    {
      remarkText: 'Attach signed endorsement letter.',
      complianceRequired: true,
    },
    '1',
    testActor
  );

  const [docWithRemark] = await db.select().from(documents).where(eq(documents.id, doc.id));
  assert.strictEqual(docWithRemark.currentStatus, 'Supervisor Comment Needed', 'Adding compliance-required remark forces currentStatus to Supervisor Comment Needed');
  pass('Supervisor remark with complianceRequired=true forces Supervisor Comment Needed status');

  // 5. Uncomplied supervisor remark blocks manager clearance and "Cleared for Out"
  await assert.rejects(
    async () => {
      await addDocumentClearance(
        doc.id,
        {
          clearanceType: 'approved_for_dispatch',
          clearanceRemarks: 'Approved prematurely',
          isCleared: true,
        },
        '1',
        managerActor
      );
    },
    (err: any) => {
      assert.ok(err instanceof DocumentValidationError);
      assert.ok(err.message.includes('unresolved compliance remarks'));
      return true;
    },
    'Clearance blocked when uncomplied supervisor remarks exist'
  );
  pass('Uncomplied supervisor remark blocks clearance and status transition');

  // 6. Fulfilling compliance permits transition to "Complied / Ready for Clearance"
  const compRes = await fulfillDocumentCompliance(
    doc.id,
    rem.id,
    'Endorsement letter attached and verified.',
    '1',
    testActor
  );

  assert.strictEqual(compRes.remark.complied, true, 'Remark marked as complied');
  assert.strictEqual(compRes.document.currentStatus, 'Complied / Ready for Clearance', 'Status transitions to Complied / Ready for Clearance upon compliance completion');
  pass('Complied remark permits transition to Complied / Ready for Clearance');

  // 7. Manager clearance transitions status to "Cleared for Out"
  const clearRes = await addDocumentClearance(
    doc.id,
    {
      clearanceType: 'approved_for_dispatch',
      clearanceRemarks: 'All requirements verified and approved.',
      isCleared: true,
    },
    '1',
    managerActor
  );

  assert.strictEqual(clearRes.document.currentStatus, 'Cleared for Out', 'Status transitions to Cleared for Out after manager clearance');
  pass('Manager clearance permits transition to Cleared for Out');

  // 8. Archived / Completed transitions to terminal "Dispatched / Completed"
  const completeRes = await addDocumentClearance(
    doc.id,
    {
      clearanceType: 'archived_completed',
      clearanceRemarks: 'Dispatched to external agency via courier.',
      isCleared: true,
    },
    '1',
    managerActor
  );

  assert.strictEqual(completeRes.document.currentStatus, 'Dispatched / Completed', 'Status transitions to Dispatched / Completed');
  pass('Archive completion transitions status to Dispatched / Completed');

  // 9. Non-privileged user cannot modify or route a terminal Dispatched / Completed document
  await assert.rejects(
    async () => {
      await routeDocumentWithTransaction(
        doc.id,
        {
          currentDesk: 'Dispatch Desk',
          forwardToDesk: 'Receiving Desk',
          statusUpdate: 'Attempting re-route',
        },
        '1',
        staffActor
      );
    },
    (err: any) => {
      assert.ok(err instanceof DocumentValidationError);
      assert.ok(err.message.includes('Dispatched / Completed'));
      return true;
    },
    'Routing rejected for terminal document by unprivileged actor'
  );
  pass('Terminal Dispatched / Completed status blocks unprivileged modifications');

  // Clean up test document
  await db.delete(documents).where(eq(documents.id, doc.id));

  console.log(`\n🎉 All ${passedTests} Phase 1 Authoritative Lifecycle tests passed successfully!\n`);
}

runTests().then(async () => {
  try {
    const { pool } = await import('../server/db/index.ts');
    await pool.end();
  } catch {}
  process.exit(0);
}).catch((err) => {
  console.error('❌ Phase 1 Authoritative Lifecycle Tests Failed:', err);
  process.exit(1);
});
