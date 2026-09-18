import assert from 'node:assert/strict';
import {
  createNewDocument,
  updateExistingDocument,
  routeDocumentWithTransaction,
  addDocumentRemark,
  fulfillDocumentCompliance,
  addDocumentClearance,
  revokeDocumentClearance,
  deleteDocumentById,
  DocumentConflictError,
} from '../server/services/documentService.ts';
import { db } from '../server/db/index.ts';
import { documents, personnel, users } from '../server/db/schema.ts';
import { eq } from 'drizzle-orm';

console.log('--- POSSD Phase 2: Optimistic Concurrency Enforcement Unit Tests ---');

let passedTests = 0;
function pass(message: string) {
  console.log(`✅ PASS: ${message}`);
  passedTests++;
}

async function runTests() {
  // Ensure test user exists
  let [testUser] = await db.select().from(users).limit(1);
  if (!testUser) {
    [testUser] = await db
      .insert(users)
      .values({
        username: 'concurrency_test_user',
        email: 'concurrency_user@possd.gov.ph',
        role: 'Department Manager',
        isActive: true,
      })
      .returning();
  }

  const actor = { id: testUser.id, userId: testUser.id, name: testUser.username, role: 'Department Manager' };

  // Ensure test personnel exists
  let [person] = await db.select().from(personnel).where(eq(personnel.status, 'active')).limit(1);
  if (!person) {
    [person] = await db
      .insert(personnel)
      .values({
        name: 'Concurrency Test Focal Person',
        username: 'concurrency_focal',
        email: 'concurrency_focal@possd.gov.ph',
        role: 'Staff',
        division: 'Administrative Services',
        status: 'active',
      })
      .returning();
  }

  // Helper to create fresh test document
  async function makeDoc() {
    const tracker = `CONCUR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const doc = await createNewDocument(
      {
        trackingNumber: tracker,
        title: 'Concurrency Test Document',
        senderName: 'Test Agency',
        originatingOffice: 'Central Office',
        responsiblePersonId: person.id,
        responsiblePerson: person.name,
        documentClassification: 'Incoming',
        transactionType: 'Simple Transaction',
      },
      String(testUser.id),
      actor
    );
    return doc;
  }

  // 1. Test updateExistingDocument concurrency conflict
  {
    const doc = await makeDoc();
    assert.strictEqual(doc.version, 1, 'Initial document version should be 1');

    // Attempt update with wrong expected version (e.g. version 99)
    let conflictThrown = false;
    try {
      await updateExistingDocument(
        doc.id,
        {
          title: 'Conflict Update Title',
        },
        99,
        String(testUser.id),
        actor
      );
    } catch (err) {
      if (err instanceof DocumentConflictError) {
        conflictThrown = true;
      } else {
        throw err;
      }
    }
    assert.ok(conflictThrown, 'updateExistingDocument must throw DocumentConflictError when version mismatches');

    // Perform successful update with correct expected version (1)
    const updated = await updateExistingDocument(
      doc.id,
      {
        title: 'Valid Update Title',
      },
      1,
      String(testUser.id),
      actor
    );
    assert.strictEqual(updated.version, 2, 'Version should increment to 2 on successful update');
    pass('updateExistingDocument correctly enforces optimistic concurrency version');
  }

  // 2. Test routeDocumentWithTransaction concurrency conflict
  {
    const doc = await makeDoc();

    // Attempt routing with stale expected version (e.g. 0)
    let conflictThrown = false;
    try {
      await routeDocumentWithTransaction(
        doc.id,
        {
          currentDesk: 'Receiving Desk',
          forwardToDesk: 'Legal Division',
          statusUpdate: 'Under Review',
          expectedVersion: 999,
        },
        String(testUser.id),
        actor,
        999
      );
    } catch (err) {
      if (err instanceof DocumentConflictError) {
        conflictThrown = true;
      } else {
        throw err;
      }
    }
    assert.ok(conflictThrown, 'routeDocumentWithTransaction must throw DocumentConflictError on stale expectedVersion');

    // Route with correct version (1)
    const routeRes = await routeDocumentWithTransaction(
      doc.id,
      {
        currentDesk: 'Receiving Desk',
        forwardToDesk: 'Legal Division',
        statusUpdate: 'Under Review',
        expectedVersion: 1,
      },
      String(testUser.id),
      actor,
      1
    );
    assert.strictEqual(routeRes.document.version, 2, 'Document version should increment after routing');
    pass('routeDocumentWithTransaction correctly enforces optimistic concurrency version');
  }

  // 3. Test addDocumentRemark concurrency conflict
  {
    const doc = await makeDoc();

    let conflictThrown = false;
    try {
      await addDocumentRemark(
        doc.id,
        {
          remarkText: 'Please review section 2.',
          complianceRequired: true,
          expectedVersion: 50,
        },
        String(testUser.id),
        actor,
        50
      );
    } catch (err) {
      if (err instanceof DocumentConflictError) {
        conflictThrown = true;
      } else {
        throw err;
      }
    }
    assert.ok(conflictThrown, 'addDocumentRemark must throw DocumentConflictError when version mismatches');

    // Add remark with correct version
    const remark = await addDocumentRemark(
      doc.id,
      {
        remarkText: 'Please review section 2.',
        complianceRequired: true,
        expectedVersion: 1,
      },
      String(testUser.id),
      actor,
      1
    );
    assert.ok(remark.id, 'Remark created successfully');

    // Fetch updated doc to verify version
    const [reloadedDoc] = await db.select().from(documents).where(eq(documents.id, doc.id));
    assert.strictEqual(reloadedDoc.version, 2, 'Document version incremented to 2 after adding compliance remark');
    pass('addDocumentRemark correctly enforces optimistic concurrency version');
  }

  // 4. Test fulfillDocumentCompliance concurrency conflict
  {
    const doc = await makeDoc();
    const remark = await addDocumentRemark(
      doc.id,
      {
        remarkText: 'Mandatory revision',
        complianceRequired: true,
      },
      String(testUser.id),
      actor
    );

    const [docAfterRemark] = await db.select().from(documents).where(eq(documents.id, doc.id));

    let conflictThrown = false;
    try {
      await fulfillDocumentCompliance(
        doc.id,
        remark.id,
        'Done section 2',
        String(testUser.id),
        actor,
        999
      );
    } catch (err) {
      if (err instanceof DocumentConflictError) {
        conflictThrown = true;
      } else {
        throw err;
      }
    }
    assert.ok(conflictThrown, 'fulfillDocumentCompliance must throw DocumentConflictError on version mismatch');

    const fulfillRes = await fulfillDocumentCompliance(
      doc.id,
      remark.id,
      'Done section 2',
      String(testUser.id),
      actor,
      docAfterRemark.version
    );
    assert.strictEqual(fulfillRes.document.version, docAfterRemark.version + 1, 'Version incremented on fulfillment');
    pass('fulfillDocumentCompliance correctly enforces optimistic concurrency version');
  }

  // 5. Test addDocumentClearance and revokeDocumentClearance concurrency conflict
  {
    const doc = await makeDoc();

    // Clearance conflict
    let conflictThrown = false;
    try {
      await addDocumentClearance(
        doc.id,
        {
          isCleared: true,
          clearanceType: 'approved_for_dispatch',
          expectedVersion: 777,
        },
        String(testUser.id),
        actor,
        777
      );
    } catch (err) {
      if (err instanceof DocumentConflictError) {
        conflictThrown = true;
      } else {
        throw err;
      }
    }
    assert.ok(conflictThrown, 'addDocumentClearance must throw DocumentConflictError on stale expectedVersion');

    // Valid clearance
    const clearRes = await addDocumentClearance(
      doc.id,
      {
        isCleared: true,
        clearanceType: 'approved_for_dispatch',
        expectedVersion: 1,
      },
      String(testUser.id),
      actor,
      1
    );
    assert.strictEqual(clearRes.document.version, 2, 'Version incremented after clearance');

    // Revoke conflict
    conflictThrown = false;
    try {
      await revokeDocumentClearance(
        doc.id,
        {
          reason: 'Correction needed',
          expectedVersion: 1, // doc is now version 2!
        },
        String(testUser.id),
        actor,
        1
      );
    } catch (err) {
      if (err instanceof DocumentConflictError) {
        conflictThrown = true;
      } else {
        throw err;
      }
    }
    assert.ok(conflictThrown, 'revokeDocumentClearance must throw DocumentConflictError on stale expectedVersion');

    // Valid revoke
    const revokeRes = await revokeDocumentClearance(
      doc.id,
      {
        reason: 'Correction needed',
        expectedVersion: 2,
      },
      String(testUser.id),
      actor,
      2
    );
    assert.strictEqual(revokeRes.document.version, 3, 'Version incremented after clearance revocation');
    pass('addDocumentClearance and revokeDocumentClearance correctly enforce optimistic concurrency version');
  }

  // 6. Test deleteDocumentById concurrency conflict
  {
    const doc = await makeDoc();

    let conflictThrown = false;
    try {
      await deleteDocumentById(doc.id, String(testUser.id), actor, 888);
    } catch (err) {
      if (err instanceof DocumentConflictError) {
        conflictThrown = true;
      } else {
        throw err;
      }
    }
    assert.ok(conflictThrown, 'deleteDocumentById must throw DocumentConflictError on version mismatch');

    // Valid delete
    const deleteRes = await deleteDocumentById(doc.id, String(testUser.id), actor, 1);
    assert.ok(deleteRes.success, 'Document deleted successfully with matching version');

    const [checkDeleted] = await db.select().from(documents).where(eq(documents.id, doc.id));
    assert.strictEqual(checkDeleted, undefined, 'Document was removed from database');
    pass('deleteDocumentById correctly enforces optimistic concurrency version');
  }

  console.log(`\n🎉 ALL ${passedTests} PHASE 2 CONCURRENCY TESTS PASSED SUCCESSFULLY!`);
}

runTests().catch((err) => {
  console.error('❌ PHASE 2 CONCURRENCY TEST FAILED:', err);
  process.exit(1);
});
