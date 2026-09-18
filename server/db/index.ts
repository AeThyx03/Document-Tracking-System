import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, PoolClient, PoolConfig } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _posSqlPool: Pool | undefined;
}

/**
 * Resolves PostgreSQL pool configuration based on available environment variables.
 * Prioritizes Cloud SQL environment variables (SQL_HOST, SQL_USER, SQL_PASSWORD, SQL_DB_NAME)
 * using the Object Method, and falls back to DATABASE_URL if explicitly provided.
 */
export function getPoolConfig(): PoolConfig {
  if (process.env.SQL_HOST && process.env.SQL_USER && process.env.SQL_DB_NAME) {
    return {
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD || '',
      database: process.env.SQL_DB_NAME,
      max: 15,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
    };
  }

  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      max: 15,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
    };
  }

  throw new Error('FATAL: Database configuration missing (SQL_HOST/SQL_USER/SQL_DB_NAME or DATABASE_URL).');
}

export const createPool = (): Pool => {
  if (!global._posSqlPool) {
    const config = getPoolConfig();
    global._posSqlPool = new Pool(config);

    global._posSqlPool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL pool client:', err);
    });

    // Graceful shutdown
    const handleShutdown = async (signal: string) => {
      if (global._posSqlPool) {
        console.log(`[POSSD] Closing database pool on ${signal}...`);
        await global._posSqlPool.end();
        global._posSqlPool = undefined;
      }
    };
    process.once('SIGTERM', () => handleShutdown('SIGTERM'));
    process.once('SIGINT', () => handleShutdown('SIGINT'));
  }
  return global._posSqlPool;
};

export const pool = createPool();
export const db = drizzle(pool, { schema });

/**
 * Reusable transaction helper with automatic rollback on error.
 * Supports running multi-statement transactional operations with a shared client.
 *
 * Example usage:
 * await withTransaction(async (tx) => {
 *   await tx.update(documents).set({ currentLocation: 'New Desk' }).where(...);
 *   await tx.insert(documentMovements).values(...);
 *   await tx.insert(auditLogs).values(...);
 * });
 */
export async function withTransaction<T>(
  callback: (tx: NodePgDatabase<typeof schema>) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    return await callback(tx as unknown as NodePgDatabase<typeof schema>);
  });
}

/**
 * Raw PG client transaction helper for low-level SQL scripts or direct querying.
 */
export async function withRawTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Tests database connectivity.
 */
export async function checkDatabaseConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const res = await pool.query('SELECT 1 as alive, NOW() as server_time');
    const latencyMs = Date.now() - start;
    if (res.rows[0]?.alive === 1) {
      return { ok: true, latencyMs };
    }
    return { ok: false, latencyMs, error: 'Query returned unexpected result' };
  } catch (err: any) {
    return { ok: false, latencyMs: Date.now() - start, error: err.message };
  }
}
