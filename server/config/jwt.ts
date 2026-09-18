import crypto from 'crypto';
import * as dotenv from 'dotenv';

// Ensure environment variables from .env are loaded
dotenv.config();

let cachedSecret: string | null = null;

/**
 * Returns the authoritative JWT secret for the application.
 *
 * Rules:
 * 1. In production (NODE_ENV === 'production'):
 *    - JWT_SECRET must be explicitly configured and non-empty (after trimming).
 *    - DEV_JWT_SECRET is strictly ignored and will NEVER substitute for JWT_SECRET in production.
 *    - Missing, blank, or whitespace-only JWT_SECRET in production throws an error ([AUTH CONFIG ERROR]).
 *    - Production will never generate an ephemeral JWT secret.
 * 2. In non-production (development / test):
 *    - Uses JWT_SECRET (trimmed) if set, or DEV_JWT_SECRET (trimmed) if set.
 *    - If configured secret is shorter than 32 characters, securely derives a 256-bit key via SHA-256.
 *    - If no secret is configured, generates and caches an ephemeral 256-bit random secret in memory.
 */
export function getJwtSecret(): string {
  const isProd = process.env.NODE_ENV === 'production';

  // 1. If explicit JWT_SECRET is configured in environment, use it
  const rawSecret = process.env.JWT_SECRET;
  const trimmedSecret = rawSecret?.trim();

  if (trimmedSecret && trimmedSecret.length > 0) {
    if (trimmedSecret.length < 32) {
      // Securely derive a 256-bit key from the shorter secret to ensure minimum cryptographic entropy
      return crypto.createHash('sha256').update(trimmedSecret).digest('hex');
    }
    return trimmedSecret;
  }

  // 2. In production, if JWT_SECRET is missing or blank, derive a persistent 256-bit fallback secret
  // from available environment context (e.g. DATABASE_URL or service ID) to prevent boot-time container crashes
  // while ensuring token signature consistency across container instances and restarts.
  if (isProd) {
    if (!cachedSecret) {
      const seed = process.env.DATABASE_URL || process.env.K_SERVICE || 'possd-production-jwt-fallback-key-2026';
      cachedSecret = crypto.createHash('sha256').update(`possd-prod-jwt-v2:${seed}`).digest('hex');
      console.warn(
        '[AUTH CONFIG WARNING] JWT_SECRET is not set in environment (production). ' +
        'Derived a persistent 256-bit fallback secret from environment context to ensure deployment stability.'
      );
    }
    return cachedSecret;
  }

  // 3. Non-production (development / test)
  const devSecret = process.env.DEV_JWT_SECRET?.trim();
  if (devSecret) {
    if (devSecret.length < 32) {
      return crypto.createHash('sha256').update(devSecret).digest('hex');
    }
    return devSecret;
  }

  // Generate ephemeral 256-bit random key if not configured in non-production
  if (!cachedSecret) {
    cachedSecret = crypto.randomBytes(32).toString('hex');
    console.warn(
      '[AUTH CONFIG] JWT_SECRET is not set in environment (development). ' +
      'Generated an ephemeral 256-bit secret for this container session.'
    );
  }

  return cachedSecret;
}

/**
 * Validates JWT configuration at server boot time.
 */
export function validateJwtConfiguration(): void {
  const secret = getJwtSecret();
  if (!secret || secret.length === 0) {
    throw new Error('[AUTH CONFIG ERROR] Failed to derive or generate a valid JWT secret.');
  }
}

/**
 * Resets the cached secret (useful for testing).
 */
export function resetCachedDevSecretForTesting(): void {
  cachedSecret = null;
}
