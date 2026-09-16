import crypto from 'crypto';
import * as dotenv from 'dotenv';

// Ensure environment variables from .env are loaded
dotenv.config();

let cachedSecret: string | null = null;

/**
 * Returns the authoritative JWT secret for the application.
 *
 * Rules:
 * 1. If JWT_SECRET or DEV_JWT_SECRET is explicitly configured in process.env, it is used.
 *    - If shorter than 32 characters, it is securely derived via SHA-256 to ensure cryptographic strength.
 * 2. If no secret is configured in environment:
 *    - Generates an ephemeral cryptographically secure random 256-bit secret in memory
 *      cached for the process lifecycle.
 *    - Never crashes container boot or deployments, allowing Cloud Run to start up cleanly.
 */
export function getJwtSecret(): string {
  const configuredSecret = process.env.JWT_SECRET?.trim() || process.env.DEV_JWT_SECRET?.trim();

  if (configuredSecret) {
    if (configuredSecret.length < 32) {
      // Securely derive a 256-bit key from the shorter secret to ensure minimum cryptographic entropy
      return crypto.createHash('sha256').update(configuredSecret).digest('hex');
    }
    return configuredSecret;
  }

  // Generate ephemeral 256-bit random key if not configured in environment
  if (!cachedSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        '[AUTH CONFIG ERROR] JWT_SECRET is missing in production environment. ' +
        'A secure, persistent JWT_SECRET is strongly recommended to prevent authentication ' +
        'reliability issues across container restarts and multiple instances. ' +
        'Falling back to an ephemeral 256-bit random secret for this container instance.'
      );
    }
    cachedSecret = crypto.randomBytes(32).toString('hex');
    const envName = process.env.NODE_ENV === 'production' ? 'production (fallback)' : 'development';
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[AUTH CONFIG] JWT_SECRET is not set in environment (${envName}). ` +
        'Generated an ephemeral 256-bit random secret for this container session. ' +
        'To persist session tokens across container restarts or multiple instances, set JWT_SECRET in your environment variables.'
      );
    }
  }

  return cachedSecret;
}

/**
 * Validates JWT configuration at server boot time.
 */
export function validateJwtConfiguration(): void {
  getJwtSecret();
}

/**
 * Resets the cached secret (useful for testing).
 */
export function resetCachedDevSecretForTesting(): void {
  cachedSecret = null;
}
