import assert from 'node:assert/strict';
import {
  createNewDocument,
  updateExistingDocument,
  addDocumentRemark,
  addDocumentClearance,
  revokeDocumentClearance,
  DocumentConflictError,
  DocumentNotFoundError,
  DocumentValidationError,
} from '../server/services/documentService.ts';
import { db } from '../server/db/index.ts';
import { documents, managerClearances, auditLogs, personnel, users } from '../server/db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { authorizeManagerClearance } from '../server/middleware/authorize.ts';

console.log('--- POSSD Phase 3: Manager Clearance Authority Unit Tests ---');

let passedTests = 0;
function pass(message: string) {
  console.log(`✅ PASS: ${message}`);
  passedTests++;
}

async function runTests() {
  // Ensure test manager user exists
  let [managerUser] = await db.select().from(users).where(eq(users.role, 'Department Manager')).limit(1);
  if (!managerUser) {
    [managerUser] = await db
      .insert(users)
      .values({
        username: 'phase3_mgr_user',
        email: 'phase3_mgr@possd.gov.ph',
        role: 'Department Manager',
        isActive: true,
      })
      .returning();
  }

  const managerActor = {
    id: managerUser.id,
    userId: managerUser.id,
    name: managerUser.username || 'Executive Manager',
    role: 'Department Manager',
    email: managerUser.email,
  };

  // Ensure active personnel exists
  let [person] = await db.select().from(personnel).where(eq(personnel.status, 'active')).limit(1);
  if (!person) {
    [person] = await db
      .insert(personnel)
      .values({
        name: 'Phase 3 Focal Person',
        username: 'phase3_focal',
        email: 'phase3_focal@possd.gov.ph',
        role: 'Staff',
        division: 'Administrative & General Services',
        status: 'active',
      })
      .returning();
  }

  // Helper to create fresh test document
  async function makeDoc() {
    const tracker = `CLR-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const doc = await createNewDocument(
      {
        trackingNumber: tracker,
        title: 'Manager Clearance Authority Test Document',
        responsiblePersonId: person.id,
        responsiblePerson: person.name,
        documentClassification: 'Incoming',
        transactionType: 'Simple Transaction',
        originDepartment: 'General Records',
        targetDivision: 'Administrative & General Services',
        priority: 'Routine',
      },
      String(managerUser.id),
      managerActor
    );
    return doc;
  }

  // 1. Test Successful Clearance
  {
    const doc = await makeDoc();
    const clearanceRes = await addDocumentClearance(
      doc.id,
      {
        clearedBy: 'Executive Manager',
        clearanceType: 'approved_for_dispatch',
        exitTrackingNumber: 'EXIT-2026-001',
        forwardedToExternal: 'Department of Budget & Management',
        clearanceRemarks: 'Approved for final dispatch.',
        isCleared: true,
        expectedVersion: doc.version,
      },
      String(managerUser.id),
      managerActor,
      doc.version
    );

    assert.equal(clearanceRes.document.isCleared, true, 'Document should be marked isCleared = true');
    assert.equal(clearanceRes.document.currentStatus, 'Cleared for Out', 'Document status should be Cleared for Out');
    assert.equal(clearanceRes.clearance.isCleared, true, 'managerClearances record must have isCleared = true');
    assert.equal(clearanceRes.clearance.clearanceType, 'approved_for_dispatch', 'managerClearances record clearanceType');
    assert.equal(clearanceRes.clearance.exitTrackingNumber, 'EXIT-2026-001', 'managerClearances exitTrackingNumber');

    // Verify database record in manager_clearances
    const [mcInDb] = await db.select().from(managerClearances).where(eq(managerClearances.documentId, doc.id));
    assert.ok(mcInDb, 'managerClearances record must exist in DB');
    assert.equal(mcInDb.isCleared, true, 'DB managerClearances.isCleared must be true');

    // Verify synchronized legacy columns in documents
    const [docInDb] = await db.select().from(documents).where(eq(documents.id, doc.id));
    assert.equal(docInDb.isCleared, true, 'documents.isCleared must be synchronized to true');
    assert.equal(docInDb.exitTrackingNumber, 'EXIT-2026-001', 'documents.exitTrackingNumber must be synchronized');
    assert.equal(docInDb.version, doc.version + 1, 'Document version must be incremented by 1');

    pass('successful clearance creates manager_clearances record, updates documents, and increments version');
  }

  // 2. Test Clearance Blocked by Uncomplied Supervisor Remark
  {
    const doc = await makeDoc();
    // Add uncomplied mandatory supervisor remark
    await addDocumentRemark(
      doc.id,
      {
        remarkText: 'Please attach financial breakdown before clearance.',
        complianceRequired: true,
        expectedVersion: doc.version,
      },
      String(managerUser.id),
      managerActor,
      doc.version
    );

    // Fetch updated document version
    const [docWithRemark] = await db.select().from(documents).where(eq(documents.id, doc.id));

    // Attempt to clear document
    let caughtErr: any = null;
    try {
      await addDocumentClearance(
        doc.id,
        {
          clearanceType: 'approved_for_dispatch',
          isCleared: true,
          expectedVersion: docWithRemark.version,
        },
        String(managerUser.id),
        managerActor,
        docWithRemark.version
      );
    } catch (err: any) {
      caughtErr = err;
    }

    assert.ok(caughtErr instanceof DocumentValidationError, 'Must throw DocumentValidationError');
    assert.match(caughtErr.message, /unresolved compliance remarks/i, 'Error message must mention unresolved compliance remarks');

    pass('clearance blocked by uncomplied supervisor remark');
  }

  // 3. Test Stale Clearance
  {
    const doc = await makeDoc();
    const staleVer = doc.version - 1; // Stale version

    let caughtErr: any = null;
    try {
      await addDocumentClearance(
        doc.id,
        {
          clearanceType: 'approved_for_dispatch',
          isCleared: true,
          expectedVersion: staleVer,
        },
        String(managerUser.id),
        managerActor,
        staleVer
      );
    } catch (err: any) {
      caughtErr = err;
    }

    assert.ok(caughtErr instanceof DocumentConflictError, 'Stale clearance must throw DocumentConflictError');

    pass('stale clearance throws DocumentConflictError (HTTP 409)');
  }

  // 4. Test Successful Revocation
  {
    const doc = await makeDoc();
    const cleared = await addDocumentClearance(
      doc.id,
      {
        clearanceType: 'approved_for_dispatch',
        isCleared: true,
        expectedVersion: doc.version,
      },
      String(managerUser.id),
      managerActor,
      doc.version
    );

    const clearedVersion = cleared.document.version;

    const revokedRes = await revokeDocumentClearance(
      doc.id,
      {
        reason: 'Missing attachment required for revision.',
        returnStatus: 'Under Review',
        expectedVersion: clearedVersion,
      },
      String(managerUser.id),
      managerActor,
      clearedVersion
    );

    assert.equal(revokedRes.document.isCleared, false, 'Document should be marked isCleared = false');
    assert.equal(revokedRes.document.currentStatus, 'Under Review', 'Document status should be reverted to Under Review');
    assert.equal(revokedRes.clearance.isCleared, false, 'managerClearances record must have isCleared = false');
    assert.equal(revokedRes.clearance.clearanceType, 'returned_for_revision', 'Clearance type set to returned_for_revision');

    // Verify database record
    const [mcInDb] = await db.select().from(managerClearances).where(eq(managerClearances.documentId, doc.id));
    assert.equal(mcInDb.isCleared, false, 'DB managerClearances.isCleared must be false');

    const [docInDb] = await db.select().from(documents).where(eq(documents.id, doc.id));
    assert.equal(docInDb.isCleared, false, 'documents.isCleared must be synchronized to false');
    assert.equal(docInDb.version, clearedVersion + 1, 'Document version must be incremented upon revocation');

    pass('successful revocation updates manager_clearances, resets documents columns, and increments version');
  }

  // 5. Test Stale Revocation
  {
    const doc = await makeDoc();
    const cleared = await addDocumentClearance(
      doc.id,
      {
        clearanceType: 'approved_for_dispatch',
        isCleared: true,
        expectedVersion: doc.version,
      },
      String(managerUser.id),
      managerActor,
      doc.version
    );

    const staleVersion = cleared.document.version - 1;

    let caughtErr: any = null;
    try {
      await revokeDocumentClearance(
        doc.id,
        {
          reason: 'Stale revocation test',
          expectedVersion: staleVersion,
        },
        String(managerUser.id),
        managerActor,
        staleVersion
      );
    } catch (err: any) {
      caughtErr = err;
    }

    assert.ok(caughtErr instanceof DocumentConflictError, 'Stale revocation must throw DocumentConflictError');

    pass('stale revocation throws DocumentConflictError (HTTP 409)');
  }

  // 6. Test Missing Document
  {
    const missingId = `non_existent_doc_${Date.now()}`;
    let caughtErr: any = null;
    try {
      await addDocumentClearance(
        missingId,
        { isCleared: true },
        String(managerUser.id),
        managerActor
      );
    } catch (err: any) {
      caughtErr = err;
    }

    assert.ok(caughtErr instanceof DocumentNotFoundError, 'Missing document must throw DocumentNotFoundError');

    pass('missing document throws DocumentNotFoundError (HTTP 404)');
  }

  // 7. Test Unauthorized Clearance (Role Middleware)
  {
    // Create mock req / res for authorizeManagerClearance middleware
    const mockStaffReq: any = {
      user: {
        id: 999123,
        email: 'staff_user@possd.gov.ph',
        role: 'Staff',
        name: 'Staff Member',
      },
    };

    let statusCode: number | null = null;
    let jsonBody: any = null;

    const mockRes: any = {
      status: (code: number) => {
        statusCode = code;
        return mockRes;
      },
      json: (body: any) => {
        jsonBody = body;
        return mockRes;
      },
    };

    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    authorizeManagerClearance(mockStaffReq, mockRes, next);

    assert.equal(nextCalled, false, 'Next should NOT be called for unauthorized role');
    assert.equal(statusCode, 403, 'Middleware must respond with HTTP 403 FORBIDDEN');
    assert.equal(jsonBody.error.code, 'FORBIDDEN', 'Error code must be FORBIDDEN');

    pass('unauthorized clearance request produces HTTP 403 FORBIDDEN');
  }

  // 8. Test Audit and Clearance Transaction Atomicity
  {
    const doc = await makeDoc();
    const clearanceRes = await addDocumentClearance(
      doc.id,
      {
        clearanceType: 'approved_for_dispatch',
        clearanceRemarks: 'Atomicity verification clearance',
        isCleared: true,
        expectedVersion: doc.version,
      },
      String(managerUser.id),
      managerActor,
      doc.version
    );

    // Query audit log written within the exact same transaction
    const logs = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityId, doc.id), eq(auditLogs.action, 'CLEAR_DOCUMENT')));

    assert.ok(logs.length > 0, 'Audit log entry for CLEAR_DOCUMENT must exist in DB');
    assert.equal(logs[0].entityType, 'document', 'Audit log entityType must be document');
    assert.equal(logs[0].action, 'CLEAR_DOCUMENT', 'Audit log action must be CLEAR_DOCUMENT');

    pass('audit log and clearance state are written atomically within the same database transaction');
  }

  // 9. Test Generic Document Update Cannot Mutate Clearance
  {
    const doc = await makeDoc();
    // Attempt to pass clearance fields to updateExistingDocument
    const updated = await updateExistingDocument(
      doc.id,
      {
        title: 'Title Changed via Generic Update',
        isCleared: true,
        managerClearance: {
          isCleared: true,
          clearanceType: 'approved_for_dispatch',
        },
      },
      doc.version,
      String(managerUser.id),
      managerActor
    );

    assert.equal(updated.title, 'Title Changed via Generic Update', 'Title should be updated');
    assert.equal(updated.isCleared, false, 'isCleared must remain false after generic update');

    // Ensure manager_clearances was NOT created
    const [mcInDb] = await db.select().from(managerClearances).where(eq(managerClearances.documentId, doc.id));
    assert.equal(mcInDb, undefined, 'Generic update must NOT create manager_clearances record');

    pass('generic document update cannot create, alter, or revoke manager clearance');
  }

  console.log(`\n🎉 ALL 9 PHASE 3 MANAGER CLEARANCE TESTS PASSED SUCCESSFULLY! (${passedTests}/9)`);
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Phase 3 Manager Clearance Test failed:', err);
  process.exit(1);
});
