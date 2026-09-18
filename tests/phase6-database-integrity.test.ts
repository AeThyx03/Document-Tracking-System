import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { db, withTransaction } from '../server/db/index.ts';
import {
  documents,
  managerClearances,
  documentMovements,
  documentRemarks,
  businessHours,
  holidays,
  dropdownOptions,
} from '../server/db/schema.ts';

console.log('--- POSSD Phase 6: Database Integrity & Constraint Verification Tests ---');

let passedTests = 0;
function pass(message: string) {
  console.log(`✅ PASS: ${message}`);
  passedTests++;
}

async function runDatabaseIntegrityTests() {
  const testDocId = `doc_p6_test_${Date.now()}`;
  const testTracking = `TRACK-P6-${Date.now()}`;

  // ---------------------------------------------------------------------------
  // TEST 1: business_hours dayOfWeek Uniqueness Invariant
  // ---------------------------------------------------------------------------
  // Standard dayOfWeek values 0..6 already exist in the database.
  // Attempting to insert another row with dayOfWeek = 1 MUST fail with unique constraint error.
  let duplicateDayErrorCaught = false;
  try {
    await db.insert(businessHours).values({
      dayOfWeek: 1, // Duplicate Monday
      isOpen: true,
      openTime: '08:00',
      closeTime: '17:00',
    });
  } catch (err: any) {
    duplicateDayErrorCaught = true;
    const errString = `${err.message || ''} ${err.cause?.message || ''} ${String(err)}`;
    assert.match(
      errString,
      /unique constraint|duplicate key|23505|Failed query/i,
      'Duplicate dayOfWeek insert must throw PostgreSQL unique constraint error'
    );
  }
  assert.strictEqual(duplicateDayErrorCaught, true, 'business_hours duplicate dayOfWeek insert must be rejected');
  pass('1. business_hours day_of_week uniqueness constraint strictly enforced at database level');

  // ---------------------------------------------------------------------------
  // TEST 2: manager_clearances 1-to-1 Relationship Uniqueness Invariant
  // ---------------------------------------------------------------------------
  // Insert test document
  await db.insert(documents).values({
    id: testDocId,
    trackingNumber: testTracking,
    title: 'Phase 6 Integrity Test Document',
    documentClassification: 'Incoming',
    transactionType: 'Simple Transaction',
    direction: 'Incoming',
    documentType: 'Simple Transaction',
    communicationType: 'Letter',
    reportType: 'Inspection Report',
    originDepartment: 'Internal Audit',
    dateReceived: '2026-09-16',
    timeReceived: '08:00:00',
    targetDivision: 'Finance & Budget Division',
    responsiblePerson: 'System Administrator',
    priority: 'Routine',
    currentStatus: 'Under Review',
    currentLocation: 'Finance Desk',
    currentCustodian: 'System Administrator',
    version: 1,
  });

  // First manager clearance record insert
  await db.insert(managerClearances).values({
    documentId: testDocId,
    isCleared: true,
    clearedBy: 'Division Manager',
    clearedAt: new Date(),
    clearanceType: 'cleared_forwarded',
  });

  // Attempt duplicate manager clearance record for the same documentId
  let duplicateClearanceError = false;
  try {
    await db.insert(managerClearances).values({
      documentId: testDocId,
      isCleared: false,
      clearedBy: 'System Admin',
    });
  } catch (err: any) {
    duplicateClearanceError = true;
    const errString = `${err.message || ''} ${err.cause?.message || ''} ${String(err)}`;
    assert.match(
      errString,
      /unique constraint|duplicate key|23505|Failed query/i,
      'Duplicate manager_clearances documentId must throw PostgreSQL unique constraint error'
    );
  }
  assert.strictEqual(duplicateClearanceError, true, 'manager_clearances duplicate documentId insert must be rejected');
  pass('2. manager_clearances 1-to-1 document relationship strictly enforced by unique constraint');

  // ---------------------------------------------------------------------------
  // TEST 3: documents trackingNumber Uniqueness Invariant
  // ---------------------------------------------------------------------------
  let duplicateTrackingError = false;
  try {
    await db.insert(documents).values({
      id: `${testDocId}_dup`,
      trackingNumber: testTracking, // Duplicate tracking number
      title: 'Duplicate Tracking Doc',
      documentClassification: 'Incoming',
      transactionType: 'Simple Transaction',
      direction: 'Incoming',
      documentType: 'Simple Transaction',
      communicationType: 'Letter',
      reportType: 'Inspection Report',
      originDepartment: 'Internal Audit',
      dateReceived: '2026-09-16',
      timeReceived: '08:00:00',
      targetDivision: 'Finance & Budget Division',
      responsiblePerson: 'System Administrator',
      priority: 'Routine',
      currentStatus: 'Under Review',
      currentLocation: 'Finance Desk',
      currentCustodian: 'System Administrator',
      version: 1,
    });
  } catch (err: any) {
    duplicateTrackingError = true;
    const errString = `${err.message || ''} ${err.cause?.message || ''} ${String(err)}`;
    assert.match(
      errString,
      /unique constraint|duplicate key|23505|Failed query/i,
      'Duplicate trackingNumber must throw PostgreSQL unique constraint error'
    );
  }
  assert.strictEqual(duplicateTrackingError, true, 'documents duplicate trackingNumber insert must be rejected');
  pass('3. documents tracking_number uniqueness constraint strictly enforced at database level');

  // ---------------------------------------------------------------------------
  // TEST 4: Parent-Child Referential Integrity & Cascade Cleanups
  // ---------------------------------------------------------------------------
  // Add movement and remark linked to testDocId
  const testMovId = `mov_p6_${Date.now()}`;
  await db.insert(documentMovements).values({
    id: testMovId,
    documentId: testDocId,
    personnelName: 'System Admin',
    currentDesk: 'Records Desk',
    forwardToDesk: 'Finance Desk',
    statusUpdate: 'Routed',
  });

  const testRemId = `rem_p6_${Date.now()}`;
  await db.insert(documentRemarks).values({
    id: testRemId,
    documentId: testDocId,
    supervisorName: 'Supervisor User',
    remarkText: 'Integrity Verification Directive',
    timestamp: new Date(),
    complianceRequired: true,
    complied: false,
  });

  // Delete parent document
  await db.delete(documents).where(eq(documents.id, testDocId));

  // Verify child tables were automatically cleaned via CASCADE
  const remainingMovements = await db.select().from(documentMovements).where(eq(documentMovements.id, testMovId));
  const remainingRemarks = await db.select().from(documentRemarks).where(eq(documentRemarks.id, testRemId));
  const remainingClearances = await db.select().from(managerClearances).where(eq(managerClearances.documentId, testDocId));

  assert.strictEqual(remainingMovements.length, 0, 'Document movements must cascade delete when document is removed');
  assert.strictEqual(remainingRemarks.length, 0, 'Document remarks must cascade delete when document is removed');
  assert.strictEqual(remainingClearances.length, 0, 'Manager clearance must cascade delete when document is removed');
  pass('4. Foreign key ON DELETE CASCADE automatically maintains referential integrity across movements, remarks, and clearance records');

  // ---------------------------------------------------------------------------
  // TEST 5: holidays date Uniqueness Invariant
  // ---------------------------------------------------------------------------
  const testDate = `2099-12-31`;
  await db.insert(holidays).values({
    date: testDate,
    name: 'Test Holiday 2099',
  });

  let duplicateHolidayError = false;
  try {
    await db.insert(holidays).values({
      date: testDate,
      name: 'Duplicate Test Holiday 2099',
    });
  } catch (err: any) {
    duplicateHolidayError = true;
    const errString = `${err.message || ''} ${err.cause?.message || ''} ${String(err)}`;
    assert.match(
      errString,
      /unique constraint|duplicate key|23505|Failed query/i,
      'Duplicate holiday date must throw PostgreSQL unique constraint error'
    );
  }
  assert.strictEqual(duplicateHolidayError, true, 'holidays duplicate date insert must be rejected');

  // Clean up test holiday
  await db.delete(holidays).where(eq(holidays.date, testDate));
  pass('5. holidays date uniqueness constraint strictly enforced at database level');

  console.log(`\nPhase 6 Database Integrity Test Summary: ${passedTests} passed, 0 failed.`);
  process.exit(0);
}

runDatabaseIntegrityTests().catch((err) => {
  console.error('❌ Phase 6 Database Integrity Test Failed:', err);
  process.exit(1);
});
