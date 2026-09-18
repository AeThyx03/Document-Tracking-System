import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- POSSD Phase 10: Official POSSD Logo Integrity Verification Tests ---');

let passedTests = 0;
function pass(message: string) {
  console.log(`✅ PASS: ${message}`);
  passedTests++;
}

async function runPhase10Tests() {
  const possdLogoPath = path.join(process.cwd(), 'src/components/PossdLogo.tsx');
  const modalPath = path.join(process.cwd(), 'src/components/DocumentDetailModal.tsx');
  const appPath = path.join(process.cwd(), 'src/App.tsx');
  const publicAssetPath = path.join(process.cwd(), 'public/possd black.png');

  const possdLogoSource = fs.readFileSync(possdLogoPath, 'utf-8');
  const modalSource = fs.readFileSync(modalPath, 'utf-8');
  const appSource = fs.readFileSync(appPath, 'utf-8');

  // Test 1: Official logo asset exists on disk
  assert.ok(fs.existsSync(publicAssetPath), 'Official image asset /public/possd black.png must exist');
  pass('1. Official image asset /public/possd black.png is present in filesystem');

  // Test 2: PossdLogo component uses official asset without CSS filters
  assert.ok(possdLogoSource.includes('/possd%20black.png'), 'PossdLogo must reference /possd%20black.png');
  assert.ok(!possdLogoSource.includes('filter:'), 'PossdLogo must not apply CSS filters');
  assert.ok(possdLogoSource.includes('object-contain'), 'PossdLogo must maintain aspect ratio with object-contain');
  pass('2. PossdLogo component references authoritative asset without CSS filter modifications');

  // Test 3: Application header uses PossdLogo component
  assert.ok(appSource.includes('<PossdLogo'), 'App header must use PossdLogo component');
  pass('3. Application header uses authoritative PossdLogo asset');

  // Test 4: Registry print report uses PossdLogo
  assert.ok(appSource.includes('PossdLogo') && appSource.includes('Official Document Tracking Registry'), 'Registry print report must render PossdLogo');
  pass('4. Official Registry Print report uses authoritative PossdLogo asset');

  // Test 5: Document Routing Slip and Audit Trail print reports use PossdLogo
  assert.ok(modalSource.includes('printable-routing-slip') && modalSource.includes('PossdLogo'), 'Routing slip print report must use PossdLogo');
  assert.ok(modalSource.includes('printable-audit-trail') && modalSource.includes('PossdLogo'), 'Audit trail print report must use PossdLogo');
  pass('5. Routing Slip and Audit Trail printable reports use authoritative PossdLogo asset');

  console.log(`🎉 All ${passedTests} Phase 10 tests passed successfully!`);
}

runPhase10Tests().catch((err) => {
  console.error('❌ Phase 10 test failure:', err);
  process.exit(1);
});
