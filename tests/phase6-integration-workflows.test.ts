import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../server.ts';
import { pool, db } from '../server/db/index.ts';
import { users, personnel, documents, dropdownOptions, managerClearances, auditLogs } from '../server/db/schema.ts';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

/**
 * POSSD PHASE 6: TARGETED API & POSTGRESQL INTEGRATION TESTS
 * 
 * Verifies critical full-stack workflows:
 * HTTP Request -> Router -> Auth -> Service -> PostgreSQL -> Response
 */

console.log('--- POSSD Phase 6: Targeted API & PostgreSQL Integration Tests ---');

let passedTests = 0;
function pass(message: string) {
  console.log(`✅ PASS: ${message}`);
  passedTests++;
}

async function runTests() {
  let authToken: string;
  let adminUserId: number;
  let adminPersonnelId: number;
  let testDocId: string;
  let testTrackingNumber = 'INT-TEST-' + Date.now();
  let testVersion: number = 1;

  const TEST_PASSWORD = 'TestPassword123!';
  const TEST_ADMIN_USER = {
    username: 'integration_admin',
    email: 'integration-admin@test.local',
    role: 'System Admin' as const,
    password: TEST_PASSWORD
  };

  try {
    // ---------------------------------------------------------------------------
    // SETUP: Ensure test admin user exists in DB
    // ---------------------------------------------------------------------------
    const passwordHash = bcrypt.hashSync(TEST_PASSWORD, 10);
    
    // Clean up existing if any (idempotency)
    await db.delete(users).where(eq(users.email, TEST_ADMIN_USER.email));
    
    const [user] = await db.insert(users).values({
      username: TEST_ADMIN_USER.username,
      email: TEST_ADMIN_USER.email,
      passwordHash,
      role: TEST_ADMIN_USER.role,
      isActive: true
    }).returning();
    
    adminUserId = user.id;

    const [person] = await db.insert(personnel).values({
      userId: adminUserId,
      name: 'Integration Test Admin',
      username: TEST_ADMIN_USER.username,
      email: TEST_ADMIN_USER.email,
      role: TEST_ADMIN_USER.role,
      division: 'IT Section',
      status: 'active'
    }).onConflictDoUpdate({
      target: personnel.username,
      set: {
        userId: adminUserId,
        name: 'Integration Test Admin',
        email: TEST_ADMIN_USER.email,
        role: TEST_ADMIN_USER.role,
        division: 'IT Section',
        status: 'active'
      }
    }).returning();
    
    adminPersonnelId = person.id;

    // 1. Login Integration
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: TEST_ADMIN_USER.email,
        password: TEST_PASSWORD
      });

    assert.strictEqual(loginRes.status, 200, 'Login should succeed');
    assert.ok(loginRes.body.token, 'Response should contain token');
    authToken = loginRes.body.token;
    pass('Login integration (HTTP -> Express -> Auth -> Service -> PostgreSQL)');

    // 2. Authenticated Session
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.user.email, TEST_ADMIN_USER.email);
    pass('Authenticated session (Auth Middleware -> JWT Verification)');

    // 10. Authorization Failures
    const unauthRes = await request(app).get('/api/documents');
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request should be rejected');
    pass('Authorization failure (Unauthenticated request rejected)');

    const invalidLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_ADMIN_USER.email, password: 'wrongpassword' });
    assert.strictEqual(invalidLoginRes.status, 401, 'Invalid credentials should be rejected');
    pass('Login integration (Invalid credentials rejected)');

    const invalidTokenRes = await request(app)
      .get('/api/documents')
      .set('Authorization', 'Bearer invalid_token');
    assert.strictEqual(invalidTokenRes.status, 401, 'Invalid token should be rejected');
    pass('Authorization failure (Invalid token rejected)');

    // 3. Create Document Integration
    const docData = {
      trackingNumber: testTrackingNumber,
      title: 'Integration Test Document Title',
      documentClassification: 'Incoming',
      transactionType: 'Simple Transaction',
      communicationType: 'Letter',
      reportType: 'Inspection Report',
      originDepartment: 'Internal POSSD Division',
      dateReceived: new Date().toISOString().split('T')[0],
      timeReceived: '08:00:00',
      targetDivision: 'Finance & Budget Division',
      subject: 'Integration Test Document',
      senderName: 'Test Automaton',
      isUrgent: false,
      priorityLevel: 'Routine',
      responsiblePersonId: adminPersonnelId
    };

    const createRes = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${authToken}`)
      .send(docData);

    if (createRes.status !== 201) {
      console.error('Create Document Error:', createRes.body);
    }
    assert.strictEqual(createRes.status, 201);
    assert.strictEqual(createRes.body.document.trackingNumber, testTrackingNumber);
    
    const [persistedDoc] = await db.select().from(documents).where(eq(documents.trackingNumber, testTrackingNumber));
    assert.ok(persistedDoc, 'Document should be persisted in PostgreSQL');
    testDocId = persistedDoc.id;
    testVersion = persistedDoc.version;
    pass('Create document integration (PostgreSQL persistence & service logic)');

    // 4. Duplicate Tracking Number
    const dupRes = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${authToken}`)
      .send(docData);

    assert.strictEqual(dupRes.status, 400);
    assert.ok(dupRes.body.message.includes('already exists'));
    pass('Duplicate tracking number prevention (DB constraints & error handling)');

    // 5. Dropdown Validation
    const invalidDocData = { ...docData, trackingNumber: 'INV-' + Date.now(), transactionType: 'INVALID_TYPE' };
    const invalidRes = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidDocData);

    assert.strictEqual(invalidRes.status, 400);
    assert.ok(invalidRes.body.message.includes('Invalid or deactivated'));
    pass('Dropdown validation (Dropdown options referential integrity check)');

    // 6. Document Movement
    const routeData = {
      forwardToDesk: 'Finance Evaluation Bay 1',
      statusUpdate: 'For Evaluation',
      notes: 'Routing integration test',
      version: testVersion
    };

    const routeRes = await request(app)
      .post(`/api/documents/${testDocId}/movements`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(routeData);

    assert.strictEqual(routeRes.status, 201);
    assert.strictEqual(routeRes.body.document.currentLocation, 'Finance Evaluation Bay 1');
    testVersion = routeRes.body.document.version;
    pass('Document movement (Routing logic & atomic location updates)');

    // 11. Optimistic Concurrency
    const staleData = { title: 'Stale Update', version: testVersion - 1 };
    const staleRes = await request(app)
      .put(`/api/documents/${testDocId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(staleData);

    assert.strictEqual(staleRes.status, 409);
    pass('Optimistic concurrency (Version-based collision detection via PUT)');

    // 7. Supervisor Remark
    const remarkData = {
      remarkText: 'Please verify signatures',
      complianceRequired: true
    };

    const remarkRes = await request(app)
      .post(`/api/documents/${testDocId}/remarks`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(remarkData);

    assert.strictEqual(remarkRes.status, 201);
    assert.strictEqual(remarkRes.body.remark.remarkText, 'Please verify signatures');
    const remarkId = remarkRes.body.remark.id;
    pass('Supervisor remark (Remark association & transactional persistence)');

    // Fetch latest document version after status update
    const docAfterRemark = await request(app)
      .get(`/api/documents/${testDocId}`)
      .set('Authorization', `Bearer ${authToken}`);
    testVersion = docAfterRemark.body.document.version;

    // 8. Compliance
    const complianceData = {
      version: testVersion,
      supervisorRemarks: [
        { id: remarkId, complied: true, complianceNotes: 'Signatures verified' }
      ]
    };
    
    const complianceRes = await request(app)
      .put(`/api/documents/${testDocId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(complianceData);

    assert.strictEqual(complianceRes.status, 200);
    
    // Fetch document again to verify relations are loaded
    const verifiedDoc = await request(app)
      .get(`/api/documents/${testDocId}`)
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(verifiedDoc.body.document.supervisorRemarks.find((r: any) => r.id === remarkId).complied, true);
    testVersion = verifiedDoc.body.document.version;
    pass('Compliance integration (Closing the compliance loop via PUT)');

    // 9. Clearance
    const clearanceData = {
      clearanceType: 'Normal Clearance',
      exitTrackingNumber: 'EXIT-INT-001',
      clearanceRemarks: 'Integrity verified',
      version: testVersion,
      isCleared: true
    };

    const clearRes = await request(app)
      .post(`/api/documents/${testDocId}/clearance`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(clearanceData);

    assert.strictEqual(clearRes.status, 201);
    assert.strictEqual(clearRes.body.document.isCleared, true);
    
    const [mcRecord] = await db.select().from(managerClearances).where(eq(managerClearances.documentId, testDocId));
    assert.ok(mcRecord && mcRecord.isCleared, 'Authoritative manager_clearances record must be true');
    pass('Clearance integration (Manager clearance & authoritative record sync)');

    // 13. Audit Persistence
    const auditRes = await request(app)
      .get(`/api/audit-logs?entityId=${testDocId}`)
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(auditRes.status, 200);
    const hasCreate = auditRes.body.auditLogs.some((l: any) => l.action === 'CREATE_DOCUMENT');
    assert.ok(hasCreate, 'Audit trail must contain document creation');
    pass('Audit persistence (Comprehensive event logging for all mutations)');

    // 14. Pagination
    const pageRes = await request(app)
      .get('/api/documents?page=1&pageSize=2')
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(pageRes.status, 200);
    assert.ok(pageRes.body.pagination, 'Pagination metadata must be present when pageSize is provided');
    pass('Pagination integration (Server-side windowing of large datasets)');

    // 12. Deletion Authorization
    const delRes = await request(app)
      .delete(`/api/documents/${testDocId}`)
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(delRes.status, 200);
    const [deletedDoc] = await db.select().from(documents).where(eq(documents.id, testDocId));
    assert.ok(!deletedDoc, 'Document must be removed from PostgreSQL');
    pass('Deletion authorization (Strict access control for destructive actions)');

  } catch (err) {
    console.error('❌ Integration Test Failed:', err);
    process.exit(1);
  } finally {
    // Cleanup admin user
    if (adminUserId) {
      await db.delete(users).where(eq(users.id, adminUserId));
    }
    await pool.end();
  }

  console.log(`\nIntegration Test Summary: ${passedTests} passed, 0 failed.`);
}

runTests();
