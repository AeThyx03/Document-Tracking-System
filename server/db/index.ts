import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, PoolClient, PoolConfig } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _posSqlPool: Pool | undefined;
}

/**
 * Resolves PostgreSQL pool configuration based on available environment variables.
 * Supports ONLY DATABASE_URL (Standard connection string)
 */
export function getPoolConfig(): PoolConfig {
  if (!process.env.DATABASE_URL) {
    if (process.env.SQL_HOST && process.env.SQL_USER && process.env.SQL_DB_NAME) {
      const host = process.env.SQL_HOST;
      const user = process.env.SQL_USER;
      const pass = process.env.SQL_PASSWORD || '';
      const dbName = process.env.SQL_DB_NAME;
      if (host.startsWith('/')) {
        process.env.DATABASE_URL = `postgresql://${user}:${pass}@localhost/${dbName}?host=${host}`;
      } else {
        process.env.DATABASE_URL = `postgresql://${user}:${pass}@${host}/${dbName}`;
      }
      console.log('[POSSD] Automatically configured DATABASE_URL from SQL_* environment variables.');
    } else {
      throw new Error('FATAL: DATABASE_URL environment variable is required.');
    }
  }

  return {
    connectionString: process.env.DATABASE_URL,
    max: 15,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
  };
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
