import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_REGISTRY_DROPDOWN_OPTIONS } from '../src/types.ts';
import { CANONICAL_ROLES } from '../src/lib/permissions.ts';

console.log('--- POSSD Phase 6: Clean Seeds & Production Defaults Unit Tests ---');

let passedTests = 0;
function pass(message: string) {
  console.log(`✅ PASS: ${message}`);
  passedTests++;
}

// ---------------------------------------------------------------------------
// PART A: CANONICAL ROLES VERIFICATION
// ---------------------------------------------------------------------------
const expectedRoles = [
  'Receiving',
  'Staff',
  'Supervisor',
  'Division Manager',
  'Department Manager',
  'System Admin',
];

assert.deepStrictEqual(
  [...CANONICAL_ROLES],
  expectedRoles,
  'Seeded canonical roles must match the 6 POSSD roles'
);
pass('Seeded canonical roles strictly match standard POSSD role structure');

// ---------------------------------------------------------------------------
// PART B: DROPDOWN DEFAULTS & ORGANIZATIONAL PURITY
// ---------------------------------------------------------------------------
const dropdowns = DEFAULT_REGISTRY_DROPDOWN_OPTIONS;

// Check departments
const forbiddenTerms = ['port manager', 'harbor master', 'marine traffic', 'example.com', 'phlpost', 'shipping line'];

function containsForbiddenTerm(list: string[] = []): string | null {
  for (const item of list) {
    for (const term of forbiddenTerms) {
      if (item.toLowerCase().includes(term)) {
        return `Item "${item}" contains forbidden term "${term}"`;
      }
    }
  }
  return null;
}

assert.strictEqual(containsForbiddenTerm(dropdowns.departments), null, 'departments must not contain port placeholders');
assert.strictEqual(containsForbiddenTerm(dropdowns.desks), null, 'desks must not contain port placeholders');
assert.strictEqual(containsForbiddenTerm(dropdowns.originatingAgencies), null, 'originating agencies must not contain port placeholders');
assert.strictEqual(containsForbiddenTerm(dropdowns.targetDivisions), null, 'target divisions must not contain port placeholders');
pass('Application dropdown defaults contain no port/marine placeholders');

// ---------------------------------------------------------------------------
// PART C: SQL MIGRATIONS AUDIT
// ---------------------------------------------------------------------------
const migrationsDir = path.resolve(process.cwd(), 'server/migrations');
const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

assert.ok(migrationFiles.length >= 3, 'All SQL migrations must be present');

for (const file of migrationFiles) {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  
  // Must not have forbidden demo terms
  for (const term of ['office of the port manager', 'marine traffic', 'example.com', 'demo@']) {
    assert.ok(
      !content.toLowerCase().includes(term),
      `Migration ${file} must not contain forbidden placeholder term "${term}"`
    );
  }
}
pass('SQL migrations are completely free of placeholder organizational data');

// Idempotency check: 0002 must contain ON CONFLICT or WHERE NOT EXISTS
const mig0002 = fs.readFileSync(path.join(migrationsDir, '0002_seed_defaults.sql'), 'utf8');
assert.ok(mig0002.includes('WHERE NOT EXISTS'), '0002 must use WHERE NOT EXISTS for idempotent seed inserts');
assert.ok(mig0002.includes('ON CONFLICT (key) DO NOTHING'), '0002 system settings must use ON CONFLICT DO NOTHING');
assert.ok(mig0002.includes('"authoritative_db": "postgresql"'), '0002 system settings must designate postgresql as authoritative');
pass('Migration 0002 is idempotent and identifies PostgreSQL as authoritative store');

// ---------------------------------------------------------------------------
// PART D: DEVELOPMENT SEED GUARD AUDIT
// ---------------------------------------------------------------------------
const seedDevContent = fs.readFileSync(path.resolve(process.cwd(), 'server/db/seed-dev.ts'), 'utf8');
assert.ok(
  seedDevContent.includes("process.env.NODE_ENV === 'production'") && seedDevContent.includes('Cannot run development seed in production mode'),
  'Development seed script must be strictly guarded against execution in production'
);
assert.ok(
  seedDevContent.includes('DEV_ADMIN_PASSWORD'),
  'Development seed must require explicit DEV_ADMIN_PASSWORD env variable'
);
pass('Development seed is strictly isolated from production mode');

console.log(`\nPhase 6 Integrity Test Summary: ${passedTests} passed, 0 failed.`);
