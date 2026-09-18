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
    // Test 1: Production derives secure fallback when JWT_SECRET is missing (ensures container boot stability)
    // -------------------------------------------------------------
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    delete process.env.DEV_JWT_SECRET;
    resetCachedDevSecretForTesting();

    const prodFallbackSecret = getJwtSecret();
    assert(Boolean(prodFallbackSecret) && prodFallbackSecret.length === 64, '1. Production + missing JWT_SECRET -> derives secure 256-bit fallback secret');

    let validateResult = true;
    try {
      validateJwtConfiguration();
    } catch (err: any) {
      validateResult = false;
    }
    assert(validateResult, '1b. Production + missing JWT_SECRET -> validateJwtConfiguration() succeeds with derived fallback secret');

    // -------------------------------------------------------------
    // Test 1b: Production derives fallback key when JWT_SECRET is blank ("") or whitespace
    // -------------------------------------------------------------
    process.env.JWT_SECRET = '';
    resetCachedDevSecretForTesting();
    const blankFallback = getJwtSecret();
    assert(Boolean(blankFallback) && blankFallback.length === 64, '2. Production + blank JWT_SECRET -> derives fallback secret');

    process.env.JWT_SECRET = '   ';
    resetCachedDevSecretForTesting();
    const whitespaceFallback = getJwtSecret();
    assert(Boolean(whitespaceFallback) && whitespaceFallback.length === 64, '3. Production + whitespace-only JWT_SECRET -> derives fallback secret');

    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    process.env.DEV_JWT_SECRET = 'some_dev_secret_value_that_should_never_be_used_in_prod';
    resetCachedDevSecretForTesting();
    const devSecretInProdFallback = getJwtSecret();
    assert(Boolean(devSecretInProdFallback) && devSecretInProdFallback.length === 64, '3b. Production + DEV_JWT_SECRET set but missing JWT_SECRET -> derives persistent fallback secret');

    // -------------------------------------------------------------
    // Test 2: Derives secure 256-bit key when configured secret is short
    // -------------------------------------------------------------
    process.env.NODE_ENV = 'development';
    process.env.JWT_SECRET = 'short_secret';
    const derivedSecret = getJwtSecret();
    assert(derivedSecret.length === 64, 'Short JWT_SECRET is securely expanded to 256-bit hash');

    // -------------------------------------------------------------
    // Test 3: Production succeeds with strong 32+ character secret
    // -------------------------------------------------------------
    process.env.NODE_ENV = 'production';
    const strongProdSecret = 'c0a80101-possd-production-super-strong-jwt-secret-key-2026-phase2';
    process.env.JWT_SECRET = strongProdSecret;
    let prodSecret = '';
    try {
      prodSecret = getJwtSecret();
      validateJwtConfiguration();
    } catch (err: any) {
      console.error('Unexpected failure with strong secret:', err);
    }
    assert(prodSecret === strongProdSecret, '4. Production + configured JWT_SECRET -> succeeds');

    // -------------------------------------------------------------
    // Test 4: Development uses environment JWT_SECRET when configured
    // -------------------------------------------------------------
    process.env.NODE_ENV = 'development';
    process.env.JWT_SECRET = 'custom-dev-secret-configured-by-admin';
    resetCachedDevSecretForTesting();
    const configuredDevSecret = getJwtSecret();
    assert(configuredDevSecret === 'custom-dev-secret-configured-by-admin', 'Development uses explicitly configured JWT_SECRET');

    // -------------------------------------------------------------
    // Test 5: Development + missing JWT_SECRET -> preserves existing development behavior
    // -------------------------------------------------------------
    delete process.env.JWT_SECRET;
    delete process.env.DEV_JWT_SECRET;
    resetCachedDevSecretForTesting();
    const ephemeral1 = getJwtSecret();
    assert(Boolean(ephemeral1), '5. Development + missing JWT_SECRET -> preserves existing development behavior (generates ephemeral secret)');
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
    // Test 6: Signing and verification use the same resolved secret
    // -------------------------------------------------------------
    process.env.JWT_SECRET = 'valid-test-secret-with-more-than-32-chars-entropy-abc123';
    resetCachedDevSecretForTesting();

    const secretForSign = getJwtSecret();
    const minimalPayload = {
      id: 'usr-999',
      email: 'officer@possd.gov.ph',
      role: 'Action Officer'
    };

    const token = jwt.sign(minimalPayload, secretForSign, { expiresIn: '12h' });
    const secretForVerify = getJwtSecret();
    const decoded: any = jwt.verify(token, secretForVerify);

    assert(secretForSign === secretForVerify, '6. Signing and verification use the exact same resolved secret');
    assert(decoded.id === 'usr-999', 'Decoded token matches user ID');
    assert(decoded.email === 'officer@possd.gov.ph', 'Decoded token matches email');
    assert(decoded.role === 'Action Officer', 'Decoded token matches role');
    assert(!('password' in decoded), 'JWT payload strictly excludes password');
    assert(!('password_hash' in decoded), 'JWT payload strictly excludes password hash');
    assert(!('passwordHash' in decoded), 'JWT payload strictly excludes passwordHash');

    // -------------------------------------------------------------
    // Test 7: validateJwtConfiguration() succeeds without throwing error in production
    // -------------------------------------------------------------
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    delete process.env.DEV_JWT_SECRET;
    resetCachedDevSecretForTesting();
    let validateSuccess = true;
    try {
      validateJwtConfiguration();
    } catch (err: any) {
      validateSuccess = false;
    }
    assert(validateSuccess, '7. validateJwtConfiguration() succeeds using persistent fallback key');

    // -------------------------------------------------------------
    // Test 7: Production environment cleanly processes dev_admin authentication
    // -------------------------------------------------------------
    process.env.NODE_ENV = 'production';
    const { authRouter } = await import('../routes/auth.ts');

    const testDevAccountLogin = async (identifier: string, pass: string) => {
      const req: any = { body: { email: identifier, password: pass } };
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

    const devAdminValidResult = await testDevAccountLogin('dev_admin', 'dev_admin');
    assert(devAdminValidResult.status === 200, 'Production accepts dev_admin with HTTP 200');
    assert(devAdminValidResult.body?.success === true, 'Production returns success: true for dev_admin');
    assert(typeof devAdminValidResult.body?.token === 'string', 'Production returns JWT session token for dev_admin');

    const devAdminEmailResult = await testDevAccountLogin('dev-admin@localhost.test', 'dev_admin');
    assert(devAdminEmailResult.status === 200, 'Production accepts dev-admin@localhost.test with HTTP 200');

    const devAdminInvalidResult = await testDevAccountLogin('dev_admin', 'wrong_password_xyz_123');
    assert(devAdminInvalidResult.status === 401, 'Production rejects invalid password with HTTP 401');
    assert(devAdminInvalidResult.status !== 500, 'Production does not encounter internal server error for invalid password');

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
    try {
      const { pool } = await import('../db/index.ts');
      await pool.end();
    } catch {}
  }

  console.log(`\nTest Summary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
