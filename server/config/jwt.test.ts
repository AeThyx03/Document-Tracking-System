/**
 * POSSD Document Tracking System - JWT Configuration & Hardening Unit Tests
 * Verifies Phase 2: Production-safe JWT authentication without hard-coded fallbacks
 */

import jwt from 'jsonwebtoken';
import { getJwtSecret, validateJwtConfiguration, resetCachedDevSecretForTesting } from './jwt.ts';

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

async function runTests() {
  console.log('\n--- POSSD JWT Authentication & Hardening Unit Tests ---');

  const originalEnv = process.env.NODE_ENV;
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalDevJwtSecret = process.env.DEV_JWT_SECRET;

  try {
    // -------------------------------------------------------------
    // Test 1: Ephemeral generation in production when JWT_SECRET is missing (failsafe container boot)
    // -------------------------------------------------------------
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    delete process.env.DEV_JWT_SECRET;
    resetCachedDevSecretForTesting();

    const prodEphemeral = getJwtSecret();
    assert(Boolean(prodEphemeral), 'Production generates ephemeral secret when unconfigured to prevent container crashes');
    assert(prodEphemeral.length === 64, 'Ephemeral production secret is 256-bit hex (64 chars)');

    // -------------------------------------------------------------
    // Test 2: Derives secure 256-bit key when configured secret is short
    // -------------------------------------------------------------
    process.env.JWT_SECRET = 'short_secret';
    const derivedSecret = getJwtSecret();
    assert(derivedSecret.length === 64, 'Short JWT_SECRET is securely expanded to 256-bit hash');

    // -------------------------------------------------------------
    // Test 3: Production succeeds with strong 32+ character secret
    // -------------------------------------------------------------
    const strongProdSecret = 'c0a80101-possd-production-super-strong-jwt-secret-key-2026-phase2';
    process.env.JWT_SECRET = strongProdSecret;
    let prodSecret = '';
    try {
      prodSecret = getJwtSecret();
    } catch (err: any) {
      console.error('Unexpected failure with strong secret:', err);
    }
    assert(prodSecret === strongProdSecret, 'Production accepts and returns authoritative 32+ char secret');

    // -------------------------------------------------------------
    // Test 4: Development uses environment JWT_SECRET when configured
    // -------------------------------------------------------------
    process.env.NODE_ENV = 'development';
    process.env.JWT_SECRET = 'custom-dev-secret-configured-by-admin';
    resetCachedDevSecretForTesting();
    const configuredDevSecret = getJwtSecret();
    assert(configuredDevSecret === 'custom-dev-secret-configured-by-admin', 'Development uses explicitly configured JWT_SECRET');

    // -------------------------------------------------------------
    // Test 5: Development generates ephemeral random secret if unconfigured (no hardcoded fallback)
    // -------------------------------------------------------------
    delete process.env.JWT_SECRET;
    delete process.env.DEV_JWT_SECRET;
    resetCachedDevSecretForTesting();
    const ephemeral1 = getJwtSecret();
    assert(Boolean(ephemeral1), 'Development generates secret when environment variable is absent');
    assert(ephemeral1.length === 64, 'Ephemeral development secret is 256-bit hex (64 chars)');
    assert(ephemeral1 !== 'dev_secret_only', 'Never falls back to hardcoded string literal "dev_secret_only"');

    // Consistent during the session
    const ephemeral2 = getJwtSecret();
    assert(ephemeral1 === ephemeral2, 'Ephemeral secret remains consistent across calls in the same session');

    // Re-generation produces different random secret after cache reset
    resetCachedDevSecretForTesting();
    const ephemeral3 = getJwtSecret();
    assert(ephemeral1 !== ephemeral3, 'Subsequent generation produces a new cryptographically random secret');

    // -------------------------------------------------------------
    // Test 6: Token signing & verification parity
    // -------------------------------------------------------------
    process.env.JWT_SECRET = 'valid-test-secret-with-more-than-32-chars-entropy-abc123';
    resetCachedDevSecretForTesting();

    const secret = getJwtSecret();
    const minimalPayload = {
      id: 'usr-999',
      email: 'officer@possd.gov.ph',
      role: 'Action Officer'
    };

    const token = jwt.sign(minimalPayload, secret, { expiresIn: '12h' });
    const decoded: any = jwt.verify(token, secret);

    assert(decoded.id === 'usr-999', 'Decoded token matches user ID');
    assert(decoded.email === 'officer@possd.gov.ph', 'Decoded token matches email');
    assert(decoded.role === 'Action Officer', 'Decoded token matches role');
    assert(!('password' in decoded), 'JWT payload strictly excludes password');
    assert(!('password_hash' in decoded), 'JWT payload strictly excludes password hash');
    assert(!('passwordHash' in decoded), 'JWT payload strictly excludes passwordHash');

    // -------------------------------------------------------------
    // Test 7: Production environment rejects development System Admin accounts
    // -------------------------------------------------------------
    process.env.NODE_ENV = 'production';
    const { authRouter } = await import('../routes/auth.ts');

    const testDevAccountLogin = async (identifier: string) => {
      const req: any = { body: { email: identifier, password: 'any_password' } };
      let status = 0;
      let body: any = null;
      const res: any = {
        status(c: number) { status = c; return this; },
        json(d: any) { body = d; return this; }
      };

      const loginLayer = authRouter.stack.find((l: any) => l.route?.path === '/auth/login' && l.route?.methods.post);
      if (loginLayer) {
        await loginLayer.route.stack[0].handle(req, res, () => {});
      }
      return { status, body };
    };

    const devAdminResult = await testDevAccountLogin('dev_admin');
    assert(devAdminResult.status === 403, 'Production rejects dev_admin with HTTP 403');
    assert(devAdminResult.body?.error === 'DEV_ACCOUNT_DISABLED', 'Production returns DEV_ACCOUNT_DISABLED error code');

    const devAdminEmailResult = await testDevAccountLogin('dev-admin@localhost.test');
    assert(devAdminEmailResult.status === 403, 'Production rejects dev-admin@localhost.test with HTTP 403');

  } finally {
    process.env.NODE_ENV = originalEnv;
    if (originalJwtSecret !== undefined) {
      process.env.JWT_SECRET = originalJwtSecret;
    } else {
      delete process.env.JWT_SECRET;
    }
    if (originalDevJwtSecret !== undefined) {
      process.env.DEV_JWT_SECRET = originalDevJwtSecret;
    } else {
      delete process.env.DEV_JWT_SECRET;
    }
    resetCachedDevSecretForTesting();
  }

  console.log(`\nTest Summary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
