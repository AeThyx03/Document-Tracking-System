/**
 * POSSD Document Tracking System - Role Authorization Unit Tests
 * Verifies Phase 3: Server-side RBAC enforcement using req.user from JWT
 */

import {
  getAuthenticatedUser,
  requirePermission,
  requireRole,
  authorizeDocumentCreation,
  authorizeDocumentDeletion,
  authorizeManagerClearance,
  authorizeSupervisorRemarks,
  authorizeStaffManagement,
  authorizeSettingsManagement,
} from './authorize.ts';
import { CANONICAL_ROLES, CanonicalRole, normalizeRole, getRolePermissions } from '../../src/lib/permissions.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${msg}`);
    failed++;
  }
}

// Mock Express request / response
function createMockReqRes(userPayload: any = null, body: any = {}) {
  const req: any = {
    user: userPayload,
    body,
    params: {},
    query: {},
  };

  let statusCode = 200;
  let jsonResult: any = null;

  const res: any = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      jsonResult = data;
      return res;
    },
  };

  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  return {
    req,
    res,
    next,
    getStatus: () => statusCode,
    getResult: () => jsonResult,
    isNextCalled: () => nextCalled,
  };
}

async function runTests() {
  console.log('\n--- POSSD Server-Side Role Authorization (RBAC) Tests ---');

  // -------------------------------------------------------------
  // Test 1: Canonical roles definition integrity
  // -------------------------------------------------------------
  const expectedRoles: CanonicalRole[] = [
    'Receiving',
    'Staff',
    'Supervisor',
    'Division Manager',
    'Department Manager',
    'System Admin',
  ];
  assert(
    JSON.stringify(CANONICAL_ROLES) === JSON.stringify(expectedRoles),
    'CANONICAL_ROLES matches the 6 canonical roles'
  );

  // -------------------------------------------------------------
  // Test 2: Unauthenticated request rejection (401)
  // -------------------------------------------------------------
  {
    const { req, res, next, getStatus, getResult, isNextCalled } = createMockReqRes(null);
    authorizeDocumentCreation(req, res, next);
    assert(getStatus() === 401, 'Unauthenticated request rejected with HTTP 401');
    assert(getResult()?.error?.code === 'UNAUTHORIZED', 'Structured UNAUTHORIZED error returned');
    assert(!isNextCalled(), 'next() was not called for unauthenticated request');
  }

  // -------------------------------------------------------------
  // Test 3: Unrecognized role denial (401/403)
  // -------------------------------------------------------------
  {
    const { req, res, next, getStatus, isNextCalled } = createMockReqRes({
      id: 99,
      email: 'unauthorized@test.local',
      role: 'SuperUserHacker',
    });
    authorizeDocumentCreation(req, res, next);
    assert(getStatus() === 401, 'Unknown or unrecognized role is denied');
    assert(!isNextCalled(), 'next() was not called for unrecognized role');
  }

  // -------------------------------------------------------------
  // Test 4: Document Creation (canLogIncoming)
  // Allowed: Receiving, Department Manager, System Admin
  // Denied: Staff, Supervisor, Division Manager
  // -------------------------------------------------------------
  const allowedCreators: CanonicalRole[] = ['Receiving', 'Department Manager', 'System Admin'];
  const deniedCreators: CanonicalRole[] = ['Staff', 'Supervisor', 'Division Manager'];

  for (const role of allowedCreators) {
    const { req, res, next, isNextCalled } = createMockReqRes({ id: 1, email: 'user@possd.gov', role });
    authorizeDocumentCreation(req, res, next);
    assert(isNextCalled(), `Document creation permitted for role "${role}"`);
  }

  for (const role of deniedCreators) {
    const { req, res, next, getStatus, getResult, isNextCalled } = createMockReqRes({
      id: 2,
      email: 'user@possd.gov',
      role,
    });
    authorizeDocumentCreation(req, res, next);
    assert(getStatus() === 403, `Document creation forbidden (403) for role "${role}"`);
    assert(getResult()?.error?.code === 'FORBIDDEN', `Structured FORBIDDEN error code returned for role "${role}"`);
    assert(!isNextCalled(), `next() not called for denied role "${role}"`);
  }

  // -------------------------------------------------------------
  // Test 5: Document Deletion (canDeleteDocuments)
  // Allowed: Department Manager, System Admin
  // Denied: Receiving, Staff, Supervisor, Division Manager
  // -------------------------------------------------------------
  const allowedDeleters: CanonicalRole[] = ['Department Manager', 'System Admin'];
  const deniedDeleters: CanonicalRole[] = ['Receiving', 'Staff', 'Supervisor', 'Division Manager'];

  for (const role of allowedDeleters) {
    const { req, res, next, isNextCalled } = createMockReqRes({ id: 1, email: 'user@possd.gov', role });
    authorizeDocumentDeletion(req, res, next);
    assert(isNextCalled(), `Document deletion permitted for role "${role}"`);
  }

  for (const role of deniedDeleters) {
    const { req, res, next, getStatus, getResult, isNextCalled } = createMockReqRes({
      id: 2,
      email: 'user@possd.gov',
      role,
    });
    authorizeDocumentDeletion(req, res, next);
    assert(getStatus() === 403, `Document deletion forbidden (403) for role "${role}"`);
    assert(getResult()?.error?.code === 'FORBIDDEN', `Structured FORBIDDEN error code for role "${role}"`);
    assert(!isNextCalled(), `next() not called for role "${role}"`);
  }

  // -------------------------------------------------------------
  // Test 6: Manager Clearance (canAuthorizeClearance)
  // Allowed: Department Manager, System Admin
  // Denied: Staff, Receiving, Supervisor, Division Manager
  // -------------------------------------------------------------
  const allowedClearers: CanonicalRole[] = ['Department Manager', 'System Admin'];
  const deniedClearers: CanonicalRole[] = ['Receiving', 'Staff', 'Supervisor', 'Division Manager'];

  for (const role of allowedClearers) {
    const { req, res, next, isNextCalled } = createMockReqRes({ id: 1, email: 'user@possd.gov', role });
    authorizeManagerClearance(req, res, next);
    assert(isNextCalled(), `Manager clearance permitted for role "${role}"`);
  }

  for (const role of deniedClearers) {
    const { req, res, next, getStatus, isNextCalled } = createMockReqRes({ id: 2, email: 'user@possd.gov', role });
    authorizeManagerClearance(req, res, next);
    assert(getStatus() === 403, `Manager clearance forbidden (403) for role "${role}"`);
    assert(!isNextCalled(), `next() not called for role "${role}"`);
  }

  // -------------------------------------------------------------
  // Test 7: Supervisor Remarks (canIssueSupervisorRemarks)
  // Allowed: Supervisor, Division Manager, Department Manager, System Admin
  // Denied: Staff, Receiving
  // -------------------------------------------------------------
  const allowedRemarkers: CanonicalRole[] = ['Supervisor', 'Division Manager', 'Department Manager', 'System Admin'];
  const deniedRemarkers: CanonicalRole[] = ['Receiving', 'Staff'];

  for (const role of allowedRemarkers) {
    const { req, res, next, isNextCalled } = createMockReqRes({ id: 1, email: 'user@possd.gov', role });
    authorizeSupervisorRemarks(req, res, next);
    assert(isNextCalled(), `Supervisor remarks permitted for role "${role}"`);
  }

  for (const role of deniedRemarkers) {
    const { req, res, next, getStatus, isNextCalled } = createMockReqRes({ id: 2, email: 'user@possd.gov', role });
    authorizeSupervisorRemarks(req, res, next);
    assert(getStatus() === 403, `Supervisor remarks forbidden (403) for role "${role}"`);
    assert(!isNextCalled(), `next() not called for role "${role}"`);
  }

  // -------------------------------------------------------------
  // Test 8: Personnel Administration (Staff management)
  // Allowed: System Admin ONLY
  // Denied: Department Manager, Division Manager, Supervisor, Staff, Receiving
  // -------------------------------------------------------------
  {
    const { req, res, next, isNextCalled } = createMockReqRes({
      id: 1,
      email: 'admin@possd.gov',
      role: 'System Admin',
    });
    authorizeStaffManagement(req, res, next);
    assert(isNextCalled(), 'Personnel administration permitted for System Admin');
  }

  const nonAdmins: CanonicalRole[] = [
    'Department Manager',
    'Division Manager',
    'Supervisor',
    'Staff',
    'Receiving',
  ];

  for (const role of nonAdmins) {
    const { req, res, next, getStatus, getResult, isNextCalled } = createMockReqRes({
      id: 3,
      email: 'user@possd.gov',
      role,
    });
    authorizeStaffManagement(req, res, next);
    assert(getStatus() === 403, `Personnel administration strictly forbidden (403) for role "${role}"`);
    assert(getResult()?.error?.code === 'FORBIDDEN', `Structured FORBIDDEN error for role "${role}"`);
    assert(!isNextCalled(), `next() not called for non-admin role "${role}"`);
  }

  // -------------------------------------------------------------
  // Test 9: Division Threshold Overrides Deletion
  // Allowed: System Admin ONLY
  // Denied: Department Manager (even though Dept Manager can manage other settings)
  // -------------------------------------------------------------
  const adminPermissions = getRolePermissions('System Admin');
  const deptMgrPermissions = getRolePermissions('Department Manager');

  assert(
    adminPermissions.canDeleteDivisionThresholdOverrides === true,
    'System Admin has canDeleteDivisionThresholdOverrides = true'
  );
  assert(
    deptMgrPermissions.canDeleteDivisionThresholdOverrides === false,
    'Department Manager has canDeleteDivisionThresholdOverrides = false'
  );

  // -------------------------------------------------------------
  // Test 10: Anti-spoofing - req.user from JWT is authoritative
  // -------------------------------------------------------------
  {
    // Client sends spoofed role in body
    const { req } = createMockReqRes(
      { id: 42, email: 'staff@possd.gov', role: 'Staff', name: 'Legitimate Staff' },
      { personnelRole: 'System Admin', personnelName: 'Hacker Admin' }
    );
    const authenticated = getAuthenticatedUser(req);
    assert(authenticated !== null, 'Authenticated user extracted from req.user');
    assert(authenticated?.role === 'Staff', 'Extracted role matches JWT ("Staff"), ignoring client body');
    assert(authenticated?.name === 'Legitimate Staff', 'Extracted name matches JWT, ignoring client body');
  }

  console.log(`\nAuthorization Test Summary: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
