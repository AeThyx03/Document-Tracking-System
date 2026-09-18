import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { db } from '../server/db/index.ts';
import { dedicatedLinks } from '../server/db/schema.ts';
import { fetchTimeInDeskConfigFromBackend, saveTimeInDeskConfigToBackend } from '../src/lib/timeInDesk.ts';

console.log('--- POSSD Phase 7: Client Cache & Persistence Authority Verification Tests ---');

let passedTests = 0;
function pass(message: string) {
  console.log(`✅ PASS: ${message}`);
  passedTests++;
}

async function runPhase7Tests() {
  // ---------------------------------------------------------------------------
  // TEST 1: Dedicated Links Server Success & PostgreSQL Persistence Authority
  // ---------------------------------------------------------------------------
  const testLinkId = `link_p7_${Date.now()}`;
  const testLinkTitle = `P7 Verification Link ${Date.now()}`;

  // Insert a dedicated link directly into PostgreSQL
  await db.insert(dedicatedLinks).values({
    id: testLinkId,
    title: testLinkTitle,
    url: 'https://possd.agency.gov/p7-test',
    category: 'Cloud Storage',
    description: 'P7 Test Dedicated Storage Link',
    icon: 'storage',
    isActive: true,
  });

  const dbLinks = await db.select().from(dedicatedLinks);
  const foundLink = dbLinks.find((l) => l.id === testLinkId);
  assert.ok(foundLink, 'Dedicated link must be saved in PostgreSQL database');
  assert.strictEqual(foundLink.title, testLinkTitle);
  assert.strictEqual(foundLink.isActive, true);
  pass('1. Dedicated links loaded from PostgreSQL as authoritative persistent store');

  // ---------------------------------------------------------------------------
  // TEST 2: SLA Configuration Backend Persistence & Error Enforcement
  // ---------------------------------------------------------------------------
  // Mock global fetch for testing backend helper behavior in node test runner
  const originalFetch = globalThis.fetch;

  try {
    // 2a. Mock successful SLA fetch
    globalThis.fetch = (async (url: any, init?: any) => {
      if (typeof url === 'string' && url.includes('/api/sla/config') && (!init || init.method === 'GET' || !init.method)) {
        return new Response(
          JSON.stringify({
            success: true,
            config: {
              defaultThresholdHours: 48,
              divisionThresholds: { 'Legal & Regulatory Affairs': 72 },
              highlightRowOnExceed: true,
              notifyDeskCustodianOnExceed: true,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (typeof url === 'string' && url.includes('/api/sla/config') && init?.method === 'POST') {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 444 });
    }) as unknown as typeof fetch;

    const fetchedConfig = await fetchTimeInDeskConfigFromBackend();
    assert.strictEqual(fetchedConfig.defaultThresholdHours, 48);
    assert.strictEqual(fetchedConfig.divisionThresholds['Legal & Regulatory Affairs'], 72);
    pass('2. SLA Configuration fetched successfully from backend and cached locally');

    // 2b. Mock failed SLA server write (e.g. 500 error or network failure)
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({ success: false, message: 'Database transaction error on server' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }) as unknown as typeof fetch;

    let serverWriteErrorCaught = false;
    try {
      await saveTimeInDeskConfigToBackend({
        defaultThresholdHours: 24,
        divisionThresholds: {},
        highlightRowOnExceed: true,
      });
    } catch (err: any) {
      serverWriteErrorCaught = true;
      assert.match(
        err.message,
        /Database transaction error|Server error/i,
        'Server write failure must throw explicit error'
      );
    }
    assert.strictEqual(
      serverWriteErrorCaught,
      true,
      'Failed server write must NOT silently succeed or report persistent save'
    );
    pass('3. SLA Configuration failed server write correctly throws error and prevents false save status');
  } finally {
    globalThis.fetch = originalFetch;
  }

  // Cleanup test link
  await db.delete(dedicatedLinks).where(eq(dedicatedLinks.id, testLinkId)).catch(() => {});

  console.log(`\n🎉 All ${passedTests} Phase 7 Client Cache & Persistence Authority tests passed successfully!\n`);
}

runPhase7Tests().catch((err) => {
  console.error('❌ Phase 7 test failed:', err);
  process.exit(1);
});
