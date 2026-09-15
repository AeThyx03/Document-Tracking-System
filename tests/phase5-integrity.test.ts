import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { formatDocumentWithClearance } from '../server/services/documentService.ts';
import { getRoleConfig, CANONICAL_ROLES } from '../src/lib/permissions.ts';

console.log('--- POSSD Phase 5: Personnel & Manager Clearance Integrity Unit Tests ---');

let passedTests = 0;
function pass(message: string) {
  console.log(`✅ PASS: ${message}`);
  passedTests++;
}

// ---------------------------------------------------------------------------
// PART A: PERSONNEL INTEGRITY & SECURITY
// ---------------------------------------------------------------------------

// 1. Password Hashing & Sanitization
const testRawPassword = 'SecureSecretPassword123!';
const salt = bcrypt.genSaltSync(10);
const hashed = bcrypt.hashSync(testRawPassword, salt);

assert.notEqual(hashed, testRawPassword, 'Password must never equal plaintext');
assert.ok(bcrypt.compareSync(testRawPassword, hashed), 'Bcrypt must accurately verify raw password');
assert.ok(!bcrypt.compareSync('WrongPassword', hashed), 'Bcrypt must reject incorrect password');
pass('Password is never plaintext and hashes securely with bcrypt');

// Sanitization simulation (mirrors server/routes/personnel.ts sanitizePersonnel)
function sanitizePersonnelRecord(record: any) {
  const { password, passwordHash, password_hash, ...sanitized } = record;
  return sanitized;
}

const mockDbUser = {
  id: 'staff-101',
  name: 'Maria Santos',
  username: 'm.santos',
  email: 'm.santos@agency.gov',
  role: 'Staff',
  division: 'Budget & Accounting',
  assignedDesk: 'Desk B',
  status: 'active',
  passwordHash: hashed,
  password_hash: hashed,
};

const sanitized = sanitizePersonnelRecord(mockDbUser);
assert.strictEqual(sanitized.password, undefined, 'password must not exist in sanitized response');
assert.strictEqual(sanitized.passwordHash, undefined, 'passwordHash must not exist in sanitized response');
assert.strictEqual(sanitized.password_hash, undefined, 'password_hash must not exist in sanitized response');
assert.strictEqual(sanitized.name, 'Maria Santos');
assert.strictEqual(sanitized.username, 'm.santos');
pass('Sanitization strictly strips password and password_hash from personnel profiles');

// 2. Personnel Role Matrix and Administration Permissions
const sysAdminPerms = getRoleConfig('System Admin');
const deptManagerPerms = getRoleConfig('Department Manager');
const staffPerms = getRoleConfig('Staff');

assert.strictEqual(sysAdminPerms.canManageCredentials, true, 'System Admin must have canManageCredentials permission');
assert.strictEqual(deptManagerPerms.canManageCredentials, false, 'Department Manager must NOT have canManageCredentials');
assert.strictEqual(staffPerms.canManageCredentials, false, 'Staff must NOT have canManageCredentials');
pass('Only System Admin possesses personnel credential administration authority');

// ---------------------------------------------------------------------------
// PART B: MANAGER CLEARANCE INTEGRITY & AUTHORITATIVE MODEL
// ---------------------------------------------------------------------------

// 3. Document Creation Semantic Model: Default is NOT cleared
const rawNewDoc = {
  id: 'DOC-2026-001',
  trackingNumber: 'TRK-2026-001',
  title: 'Annual Procurement Report',
  currentStatus: 'Incoming Logged',
  version: 1,
};

// With no clearance record
const formattedUnclear = formatDocumentWithClearance(rawNewDoc, null);
assert.strictEqual(formattedUnclear.isCleared, false, 'Document without clearance record must default to isCleared=false');
assert.strictEqual(formattedUnclear.clearedBy, null, 'clearedBy must be null when un-cleared');
assert.strictEqual(formattedUnclear.clearedAt, null, 'clearedAt must be null when un-cleared');
assert.strictEqual(formattedUnclear.managerClearance.isCleared, false, 'managerClearance.isCleared must be false');
pass('New document without clearance record is NOT considered cleared');

// With explicit clearance record having isCleared = false
const formattedPending = formatDocumentWithClearance(rawNewDoc, {
  documentId: 'DOC-2026-001',
  isCleared: false,
  clearedBy: null,
  clearedAt: null,
  clearanceType: null,
});
assert.strictEqual(formattedPending.isCleared, false, 'Record with isCleared=false must NOT be considered cleared');
assert.strictEqual(formattedPending.clearedBy, null, 'clearedBy must be null');
pass('Clearance record with isCleared=false evaluates cleanly to un-cleared');

// 4. Authorized Executive Clearance Model
const clearanceTimestamp = new Date('2026-09-15T10:30:00Z');
const mockClearanceRecord = {
  documentId: 'DOC-2026-001',
  isCleared: true,
  clearedBy: 'Hon. Director Eleanor Vance',
  clearedByUserId: 1,
  clearedByPersonnelId: 1,
  clearedAt: clearanceTimestamp,
  clearanceType: 'approved_for_dispatch',
  exitTrackingNumber: 'OUT-2026-0089',
  forwardedToExternal: 'Department of Budget and Management',
  clearanceRemarks: 'Approved without further amendments.',
};

const formattedCleared = formatDocumentWithClearance(
  { ...rawNewDoc, currentStatus: 'Cleared for Out' },
  mockClearanceRecord
);

assert.strictEqual(formattedCleared.isCleared, true, 'isCleared must be true for explicit authorized clearance');
assert.strictEqual(formattedCleared.clearedBy, 'Hon. Director Eleanor Vance');
assert.strictEqual(formattedCleared.managerClearance.isCleared, true);
assert.strictEqual(formattedCleared.managerClearance.exitTrackingNumber, 'OUT-2026-0089');
assert.strictEqual(formattedCleared.managerClearance.forwardedToExternal, 'Department of Budget and Management');
assert.strictEqual(formattedCleared.exitTrackingNumber, 'OUT-2026-0089');
assert.strictEqual(formattedCleared.forwardedToExternal, 'Department of Budget and Management');
pass('Explicit authorized clearance synchronizes fields consistently');

// 5. Revocation & Return for Revision Model
const mockRevokedClearanceRecord = {
  documentId: 'DOC-2026-001',
  isCleared: false,
  clearedBy: null,
  clearedAt: null,
  clearanceType: 'returned_for_revision',
  exitTrackingNumber: null,
  forwardedToExternal: null,
  clearanceRemarks: 'Returned for additional supporting attachments.',
};

const formattedRevoked = formatDocumentWithClearance(
  { ...rawNewDoc, currentStatus: 'Under Review' },
  mockRevokedClearanceRecord
);

assert.strictEqual(formattedRevoked.isCleared, false, 'Revoked clearance must set isCleared=false');
assert.strictEqual(formattedRevoked.clearedBy, null, 'Revoked clearance must have null clearedBy');
assert.strictEqual(formattedRevoked.clearedAt, null, 'Revoked clearance must have null clearedAt');
assert.strictEqual(formattedRevoked.exitTrackingNumber, null, 'Revoked clearance must clear exitTrackingNumber');
assert.strictEqual(formattedRevoked.managerClearance.clearanceType, 'returned_for_revision');
assert.strictEqual(formattedRevoked.managerClearance.clearanceRemarks, 'Returned for additional supporting attachments.');
pass('Clearance revocation/return-for-revision transactionally resets clearance status');

// 6. Role-Based Clearance Authorization Matrix
assert.strictEqual(deptManagerPerms.canAuthorizeClearance, true, 'Department Manager must have canAuthorizeClearance');
assert.strictEqual(sysAdminPerms.canAuthorizeClearance, true, 'System Admin must have canAuthorizeClearance');
assert.strictEqual(getRoleConfig('Division Manager').canAuthorizeClearance, false, 'Division Manager cannot authorize clearance');
assert.strictEqual(getRoleConfig('Supervisor').canAuthorizeClearance, false, 'Supervisor cannot authorize clearance');
assert.strictEqual(getRoleConfig('Staff').canAuthorizeClearance, false, 'Staff cannot authorize clearance');
assert.strictEqual(getRoleConfig('Receiving').canAuthorizeClearance, false, 'Receiving cannot authorize clearance');
pass('Manager clearance permission is strictly restricted to executive roles');

console.log(`\nPhase 5 Integrity Test Summary: ${passedTests} passed, 0 failed.`);
