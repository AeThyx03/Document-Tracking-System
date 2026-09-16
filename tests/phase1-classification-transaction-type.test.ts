import assert from 'node:assert/strict';
import { formatDocumentWithClearance } from '../server/services/documentService.ts';
import { normalizeDocumentItem, DocumentItem } from '../src/types.ts';
import { documents } from '../server/db/schema.ts';

console.log('--- POSSD Phase 1: Document Classification & Transaction Type Separation Unit Tests ---');

let passedTests = 0;
function pass(message: string) {
  console.log(`✅ PASS: ${message}`);
  passedTests++;
}

// ---------------------------------------------------------------------------
// 1. Schema & Column Presence
// ---------------------------------------------------------------------------
assert.ok(documents.documentClassification, 'documents table must contain documentClassification column');
assert.ok(documents.transactionType, 'documents table must contain transactionType column');
assert.ok(documents.direction, 'documents table must retain legacy direction column for backward compatibility');
assert.ok(documents.documentType, 'documents table must retain legacy documentType column for backward compatibility');
pass('Schema definition includes separate documentClassification and transactionType columns with legacy backward-compatibility fields');

// ---------------------------------------------------------------------------
// 2. Client-side normalizeDocumentItem integrity
// ---------------------------------------------------------------------------

// Test 2A: Explicit documentClassification and transactionType provided
const explicitDoc = normalizeDocumentItem({
  id: 'doc-001',
  trackingNumber: 'POSSD-2026-09-0001',
  title: 'Quarterly Infrastructure Assessment',
  documentClassification: 'Incoming',
  transactionType: 'Complex Transaction',
  direction: 'Incoming',
  documentType: 'Complex Transaction',
});

assert.strictEqual(explicitDoc.documentClassification, 'Incoming', 'documentClassification should be Incoming');
assert.strictEqual(explicitDoc.transactionType, 'Complex Transaction', 'transactionType should be Complex Transaction');
assert.strictEqual(explicitDoc.direction, 'Incoming', 'direction should be Incoming for backward compatibility');
assert.strictEqual(explicitDoc.documentType, 'Complex Transaction', 'documentType should be Complex Transaction for backward compatibility');
pass('normalizeDocumentItem maintains explicit documentClassification and transactionType independently');

// Test 2B: Independence test - Different values and no cross-contamination
const distinctDoc = normalizeDocumentItem({
  id: 'doc-002',
  trackingNumber: 'OUT-2026-0099',
  title: 'Inter-Agency Transmittal',
  documentClassification: 'Outgoing',
  transactionType: 'Simple Transaction',
});

assert.strictEqual(distinctDoc.documentClassification, 'Outgoing');
assert.strictEqual(distinctDoc.transactionType, 'Simple Transaction');
assert.notStrictEqual(distinctDoc.documentClassification, distinctDoc.transactionType, 'Classification and Transaction Type must not be equal or cross-assigned');
assert.strictEqual(distinctDoc.direction, 'Outgoing', 'direction mapped to documentClassification');
assert.strictEqual(distinctDoc.documentType, 'Simple Transaction', 'documentType mapped to transactionType');
pass('Document Classification and Transaction Type do not cross-contaminate when distinct values are used');

// Test 2C: Backward compatibility - Only legacy fields provided
const legacyDoc = normalizeDocumentItem({
  id: 'doc-003',
  trackingNumber: 'TRK-2025-8888',
  title: 'Legacy Budget Document',
  direction: 'Incoming',
  documentType: 'Highly Technical Transaction',
});

assert.strictEqual(legacyDoc.documentClassification, 'Incoming', 'Legacy direction must populate documentClassification');
assert.strictEqual(legacyDoc.transactionType, 'Highly Technical Transaction', 'Legacy documentType must populate transactionType');
assert.strictEqual(legacyDoc.direction, 'Incoming', 'Legacy direction preserved');
assert.strictEqual(legacyDoc.documentType, 'Highly Technical Transaction', 'Legacy documentType preserved');
pass('Legacy records with only direction and documentType are safely normalized to new fields without data loss');

// ---------------------------------------------------------------------------
// 3. Server-side formatDocumentWithClearance integrity
// ---------------------------------------------------------------------------

// Test 3A: Server formatting with both new fields in DB record
const rawDbDoc = {
  id: 'doc-srv-1',
  trackingNumber: 'POSSD-2026-09-0010',
  title: 'Regional Audit Briefing',
  documentClassification: 'Outgoing',
  transactionType: 'Highly Technical Transaction',
  direction: 'Outgoing',
  documentType: 'Highly Technical Transaction',
  communicationType: 'Executive Brief',
  reportType: 'Audit Report',
  originDepartment: 'Finance Division',
  targetDivision: 'Regional Director',
  responsiblePerson: 'Mary Flor Aquino',
  priority: 'Rush',
  currentStatus: 'Under Review',
  currentLocation: 'Legal Desk',
  currentCustodian: 'Atty. Santos',
  version: 2,
};

const formatted = formatDocumentWithClearance(rawDbDoc, null);
assert.strictEqual(formatted.documentClassification, 'Outgoing', 'Formatted document must contain documentClassification');
assert.strictEqual(formatted.transactionType, 'Highly Technical Transaction', 'Formatted document must contain transactionType');
assert.strictEqual(formatted.direction, 'Outgoing', 'Formatted document must preserve direction');
assert.strictEqual(formatted.documentType, 'Highly Technical Transaction', 'Formatted document must preserve documentType');
pass('formatDocumentWithClearance returns discrete documentClassification and transactionType fields alongside legacy fields');

// Test 3B: Server formatting with legacy DB record (where new columns might be null)
const legacyDbDoc = {
  id: 'doc-srv-2',
  trackingNumber: 'TRK-2024-0042',
  title: 'Old Archived Memorandum',
  documentClassification: null,
  transactionType: null,
  direction: 'Incoming',
  documentType: 'Complex Transaction',
  communicationType: 'Memorandum',
  reportType: 'N/A',
  originDepartment: 'Civil Service Commission',
  targetDivision: 'Administration',
  responsiblePerson: 'Aubrey Camille Cabreras',
  priority: 'Routine',
  currentStatus: 'Dispatched / Completed',
  currentLocation: 'Records Archive',
  currentCustodian: 'Archivist',
  version: 1,
};

const formattedLegacy = formatDocumentWithClearance(legacyDbDoc, null);
assert.strictEqual(formattedLegacy.documentClassification, 'Incoming', 'Fallback to legacy direction must work seamlessly');
assert.strictEqual(formattedLegacy.transactionType, 'Complex Transaction', 'Fallback to legacy documentType must work seamlessly');
assert.strictEqual(formattedLegacy.direction, 'Incoming');
assert.strictEqual(formattedLegacy.documentType, 'Complex Transaction');
pass('formatDocumentWithClearance gracefully falls back to legacy columns if database columns are null');

console.log(`\n🎉 All ${passedTests} Phase 1 tests passed successfully!`);
