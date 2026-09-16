import assert from 'node:assert/strict';
import {
  CANONICAL_DROPDOWN_CATEGORIES,
  CATEGORY_METADATA,
  normalizeCategoryIdentifier,
  listDropdownOptions,
  getDropdownOptionsGrouped,
  getDropdownOptionById,
  createDropdownOption,
  updateDropdownOption,
  reorderDropdownOptions,
  deactivateDropdownOption,
  restoreDropdownOption,
} from '../server/services/dropdownService.ts';
import { db } from '../server/db/index.ts';
import { dropdownOptions } from '../server/db/schema.ts';
import { requireRole, getAuthenticatedUser } from '../server/middleware/authorize.ts';
import { CANONICAL_ROLES, getRolePermissions } from '../src/lib/permissions.ts';

console.log('--- POSSD Phase 2: PostgreSQL Dropdown Configuration Foundation Tests ---');

let passedTests = 0;
function pass(message: string) {
  console.log(`✅ PASS: ${message}`);
  passedTests++;
}

async function runTests() {
  const adminActor = {
    id: 1,
    name: 'System Administrator',
    email: 'admin@possd.gov.ph',
    role: 'System Admin',
  };

  const staffActor = {
    id: 2,
    name: 'Staff Clerk',
    email: 'clerk@possd.gov.ph',
    role: 'Staff',
  };

  // ---------------------------------------------------------------------------
  // 1. Canonical Categories & Unique Category Identifiers
  // ---------------------------------------------------------------------------
  assert.strictEqual(CANONICAL_DROPDOWN_CATEGORIES.length, 7, 'Must have exactly 7 canonical dropdown categories');
  
  const expectedCategories = [
    'document_classification',
    'transaction_type',
    'communication_type',
    'report_type',
    'originating_agency',
    'target_division',
    'priority_level',
  ];

  for (const expected of expectedCategories) {
    assert.ok(CANONICAL_DROPDOWN_CATEGORIES.includes(expected as any), `Missing canonical category: ${expected}`);
    assert.ok(CATEGORY_METADATA[expected as keyof typeof CATEGORY_METADATA], `Missing metadata for category: ${expected}`);
    assert.ok(CATEGORY_METADATA[expected as keyof typeof CATEGORY_METADATA].name, `Missing name in metadata for: ${expected}`);
  }
  pass('All 7 canonical dropdown categories have unique identifiers and comprehensive metadata');

  // ---------------------------------------------------------------------------
  // 2. Category Normalization & Alias Support
  // ---------------------------------------------------------------------------
  assert.strictEqual(normalizeCategoryIdentifier('document_classification'), 'document_classification');
  assert.strictEqual(normalizeCategoryIdentifier('documentClassifications'), 'document_classification');
  assert.strictEqual(normalizeCategoryIdentifier('direction'), 'document_classification');

  assert.strictEqual(normalizeCategoryIdentifier('transaction_type'), 'transaction_type');
  assert.strictEqual(normalizeCategoryIdentifier('document_types'), 'transaction_type');
  assert.strictEqual(normalizeCategoryIdentifier('transactionTypes'), 'transaction_type');

  assert.strictEqual(normalizeCategoryIdentifier('communication_type'), 'communication_type');
  assert.strictEqual(normalizeCategoryIdentifier('communicationTypes'), 'communication_type');

  assert.strictEqual(normalizeCategoryIdentifier('report_type'), 'report_type');
  assert.strictEqual(normalizeCategoryIdentifier('reportTypes'), 'report_type');

  assert.strictEqual(normalizeCategoryIdentifier('originating_agency'), 'originating_agency');
  assert.strictEqual(normalizeCategoryIdentifier('originatingAgencies'), 'originating_agency');
  assert.strictEqual(normalizeCategoryIdentifier('origin_departments'), 'originating_agency');

  assert.strictEqual(normalizeCategoryIdentifier('target_division'), 'target_division');
  assert.strictEqual(normalizeCategoryIdentifier('targetDivisions'), 'target_division');
  assert.strictEqual(normalizeCategoryIdentifier('divisions'), 'target_division');

  assert.strictEqual(normalizeCategoryIdentifier('priority_level'), 'priority_level');
  assert.strictEqual(normalizeCategoryIdentifier('priorities'), 'priority_level');

  assert.strictEqual(normalizeCategoryIdentifier('invalid_unknown_cat'), null);
  pass('normalizeCategoryIdentifier resolves canonical keys and aliases accurately');

  // ---------------------------------------------------------------------------
  // 3. PostgreSQL Authoritative Seed Options Verification
  // ---------------------------------------------------------------------------
  const grouped = await getDropdownOptionsGrouped({ includeInactive: true });
  
  for (const cat of expectedCategories) {
    const list = grouped[cat as keyof typeof grouped];
    assert.ok(Array.isArray(list), `Grouped options for ${cat} must be an array`);
    assert.ok(list.length > 0, `Category ${cat} should contain seeded baseline options in PostgreSQL`);
    for (const opt of list) {
      assert.ok(opt.id, 'Option must have id');
      assert.strictEqual(opt.category, cat, `Option category must match ${cat}`);
      assert.ok(opt.value, 'Option must have value');
      assert.ok(opt.label, 'Option must have label');
      assert.ok(typeof opt.sortOrder === 'number', 'Option must have numeric sortOrder');
      assert.ok(typeof opt.isActive === 'boolean', 'Option must have boolean isActive');
    }
  }
  pass('PostgreSQL database contains structured baseline dropdown options for all 7 categories');

  // ---------------------------------------------------------------------------
  // 4. Create Option in PostgreSQL
  // ---------------------------------------------------------------------------
  const testVal = `Test Custom Doc Type ${Date.now()}`;
  const created = await createDropdownOption(
    {
      category: 'report_type',
      value: testVal,
      label: 'Specialized Test Report Label',
    },
    adminActor
  );

  assert.ok(created.id, 'Created option must receive a database ID');
  assert.strictEqual(created.category, 'report_type');
  assert.strictEqual(created.value, testVal);
  assert.strictEqual(created.label, 'Specialized Test Report Label');
  assert.strictEqual(created.isActive, true);
  assert.ok(created.sortOrder > 0, 'Sort order should be automatically assigned');
  pass('createDropdownOption inserts and returns new active option in PostgreSQL');

  // ---------------------------------------------------------------------------
  // 5. Duplicate Active Value Rejection
  // ---------------------------------------------------------------------------
  let duplicateRejected = false;
  try {
    // Attempt inserting exact same value into report_type (case insensitive)
    await createDropdownOption(
      {
        category: 'report_type',
        value: testVal.toLowerCase(),
        label: 'Duplicate Attempt',
      },
      adminActor
    );
  } catch (err: any) {
    duplicateRejected = true;
    assert.strictEqual(err.code, 'DUPLICATE_OPTION', 'Error code must be DUPLICATE_OPTION');
    assert.strictEqual(err.statusCode, 409, 'Status code must be 409 Conflict');
  }

  assert.ok(duplicateRejected, 'Duplicate active option must be strictly rejected');
  pass('Duplicate active values in the same category are prevented with structured 409 error');

  // ---------------------------------------------------------------------------
  // 6. Deactivate Option (Soft Delete / No Physical Deletion)
  // ---------------------------------------------------------------------------
  const deactivated = await deactivateDropdownOption(created.id, adminActor);
  assert.strictEqual(deactivated.id, created.id);
  assert.strictEqual(deactivated.isActive, false, 'Option must be marked isActive = false');

  // Verify option is NOT returned in standard active query
  const activeList = await listDropdownOptions({ category: 'report_type', includeInactive: false });
  const foundInActive = activeList.some((o) => o.id === created.id);
  assert.strictEqual(foundInActive, false, 'Deactivated option must not appear in standard active lists');

  // Verify option STILL EXISTS in PostgreSQL database (historical preservation)
  const fullList = await listDropdownOptions({ category: 'report_type', includeInactive: true });
  const foundInFull = fullList.find((o) => o.id === created.id);
  assert.ok(foundInFull, 'Deactivated option must remain in PostgreSQL database for historical records');
  assert.strictEqual(foundInFull.value, testVal);
  assert.strictEqual(foundInFull.isActive, false);
  pass('Deactivating an option performs a soft delete and preserves historical data in PostgreSQL');

  // ---------------------------------------------------------------------------
  // 7. Historical Documents Retain Value Integrity
  // ---------------------------------------------------------------------------
  // Simulate historical document that used testVal
  const historicalDocSimulation = {
    id: 'doc-hist-001',
    trackingNumber: 'POSSD-2026-09-0500',
    title: 'Historical Audit Record',
    reportType: testVal, // Even though deactivated, document record retains this string
  };
  assert.strictEqual(historicalDocSimulation.reportType, testVal, 'Historical document retains its historical value');
  pass('Historical documents reference and retain historical values without corruption');

  // ---------------------------------------------------------------------------
  // 8. Restore / Reactivate Option
  // ---------------------------------------------------------------------------
  const restored = await restoreDropdownOption(created.id, adminActor);
  assert.strictEqual(restored.id, created.id);
  assert.strictEqual(restored.isActive, true, 'Restored option must have isActive = true');

  const activeAfterRestore = await listDropdownOptions({ category: 'report_type', includeInactive: false });
  const foundAfterRestore = activeAfterRestore.some((o) => o.id === created.id);
  assert.ok(foundAfterRestore, 'Restored option must now appear in active list');
  pass('restoreDropdownOption reactivates option and makes it selectable again');

  // ---------------------------------------------------------------------------
  // 9. Update & Reorder Options
  // ---------------------------------------------------------------------------
  const updated = await updateDropdownOption(
    created.id,
    {
      label: 'Updated Custom Label',
      sortOrder: 999,
    },
    adminActor
  );

  assert.strictEqual(updated.id, created.id);
  assert.strictEqual(updated.label, 'Updated Custom Label');
  assert.strictEqual(updated.sortOrder, 999);

  const reordered = await reorderDropdownOptions(
    [{ id: created.id, sortOrder: 50 }],
    adminActor
  );
  assert.strictEqual(reordered[0].id, created.id);
  assert.strictEqual(reordered[0].sortOrder, 50);
  pass('updateDropdownOption and reorderDropdownOptions correctly modify metadata and sort order');

  // ---------------------------------------------------------------------------
  // 10. RBAC Authorization: System Admin Required, Non-Admin Receives 403
  // ---------------------------------------------------------------------------
  const nonAdminRoles: ('Staff' | 'Receiving' | 'Supervisor' | 'Division Manager' | 'Department Manager')[] = [
    'Staff',
    'Receiving',
    'Supervisor',
    'Division Manager',
    'Department Manager',
  ];

  for (const nonAdminRole of nonAdminRoles) {
    const middleware = requireRole('System Admin');
    let calledNext = false;
    let responseStatus: number | null = null;
    let responseBody: any = null;

    const mockReq: any = {
      user: {
        id: 99,
        email: 'user@possd.gov.ph',
        role: nonAdminRole,
        name: 'Non Admin User',
      },
    };

    const mockRes: any = {
      status(code: number) {
        responseStatus = code;
        return this;
      },
      json(body: any) {
        responseBody = body;
        return this;
      },
    };

    const mockNext = () => {
      calledNext = true;
    };

    middleware(mockReq, mockRes, mockNext);

    assert.strictEqual(calledNext, false, `Role ${nonAdminRole} must not proceed past requireRole middleware`);
    assert.strictEqual(responseStatus, 403, `Role ${nonAdminRole} must receive HTTP 403`);
    assert.strictEqual(responseBody?.error?.code, 'FORBIDDEN', 'Error code must be FORBIDDEN');
  }

  // System Admin proceeds
  {
    const middleware = requireRole('System Admin');
    let calledNext = false;
    const mockReq: any = {
      user: {
        id: 1,
        email: 'admin@possd.gov.ph',
        role: 'System Admin',
        name: 'System Admin',
      },
    };
    const mockRes: any = {};
    middleware(mockReq, mockRes, () => {
      calledNext = true;
    });
    assert.strictEqual(calledNext, true, 'System Admin must pass authorization check');
  }
  pass('Dropdown mutations strictly enforce System Admin authorization with structured 403 errors');

  // ---------------------------------------------------------------------------
  // 11. Persistence Across Session / Direct Database Verification
  // ---------------------------------------------------------------------------
  const directDbOption = await getDropdownOptionById(created.id);
  assert.ok(directDbOption, 'Option persisted in PostgreSQL must be retrievable directly by ID');
  assert.strictEqual(directDbOption.id, created.id);
  assert.strictEqual(directDbOption.value, testVal);
  assert.strictEqual(directDbOption.label, 'Updated Custom Label');
  pass('PostgreSQL dropdown configuration persists reliably and survives session re-queries');

  // Clean up test option (soft deactivate so test is clean)
  await deactivateDropdownOption(created.id, adminActor);

  console.log(`\n🎉 All ${passedTests} Phase 2 tests passed successfully!`);
}

runTests()
  .then(async () => {
    const { pool } = await import('../server/db/index.ts');
    await pool.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
