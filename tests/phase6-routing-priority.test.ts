import assert from 'node:assert/strict';
import { db } from '../server/db/index.ts';
import { dropdownOptions, documents } from '../server/db/schema.ts';
import { eq, and } from 'drizzle-orm';
import {
  getDropdownOptionsGrouped,
  createDropdownOption,
  deactivateDropdownOption,
} from '../server/services/dropdownService.ts';
import {
  createNewDocument,
  getAllDocuments,
} from '../server/services/documentService.ts';

console.log('--- POSSD Phase 6: Configurable Routing Priority Tests ---');
let passedTests = 0;
function pass(message: string) {
  console.log(`✅ PASS: ${message}`);
  passedTests++;
}

async function runTest() {
  try {
    // 1. Add custom priority
    const customPriority = 'Super Critical_' + Date.now();
    const newOption = await createDropdownOption({ category: 'priority_level', value: customPriority, label: customPriority });
    assert.strictEqual(newOption.value, customPriority, 'Priority created correctly');
    pass('Added custom priority');

    // Verify it's in the dropdown options
    let opts = await getDropdownOptionsGrouped();
    assert.ok(opts['priority_level'].map(o => o.value).includes(customPriority), 'Priority is available in options');
    pass('Priority is in active list');

    const activeDept = opts['originating_agency']?.[0]?.value || 'General Records';

    // 2. Use it in a new document
    const docData = {
      trackingNumber: 'PRI-TEST-' + Date.now(),
      title: 'Priority Test Doc',
      documentClassification: 'Incoming',
      transactionType: 'Simple Transaction',
      communicationType: 'Letter',
      reportType: 'Audit Report',
      originDepartment: activeDept,
      dateReceived: '2026-09-15',
      timeReceived: '12:00:00',
      targetDivision: 'Finance & Budget Division',
      responsiblePersonId: 1,
      priority: customPriority
    };

    const docId = await createNewDocument(docData, '1');
    pass('Used custom priority in a new document');

    // 3. Deactivate it
    await deactivateDropdownOption(newOption.id);
    pass('Deactivated custom priority');

    // 4. Verify it is unavailable for new documents
    opts = await getDropdownOptionsGrouped();
    assert.ok(!opts['priority_level'].map(o => o.value).includes(customPriority), 'Priority no longer in active options');
    pass('Priority is unavailable for new documents');

    // 5. Verify existing document continues displaying it
    const docsResult = await getAllDocuments();
    const docs = docsResult.filter(d => d.id === docId.id);
    console.log('Docs:', docsResult.length, 'docId:', docId);
    assert.strictEqual(docs[0].priority, customPriority, 'Existing document retained historical priority');
    pass('Existing document continues displaying deactivated priority');

    // 6. Verify registry filtering still works
    const filtered = await getAllDocuments({ priority: customPriority });
    assert.ok(filtered.length >= 1, 'Filtering by deactivated custom priority still returns the document');
    assert.strictEqual(filtered[0].priority, customPriority, 'Filtered document matches priority');
    pass('Registry filtering still works for historical custom priority');

    // Cleanup
    await db.delete(documents).where(eq(documents.id, docId.id));

    console.log(`\nTest Summary: ${passedTests} passed, 0 failed.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ FAIL', err);
    process.exit(1);
  }
}

runTest();
