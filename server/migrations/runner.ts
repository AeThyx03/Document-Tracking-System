import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MigrationResult {
  name: string;
  status: 'applied' | 'skipped' | 'failed';
  error?: string;
  durationMs: number;
}

/**
 * Executes all pending database migrations in chronological order.
 * Tracks applied migrations in the `_migrations` metadata table.
 */
export async function runMigrations(): Promise<{ success: boolean; results: MigrationResult[] }> {
  const client = await pool.connect();
  const results: MigrationResult[] = [];

  try {
    // 1. Ensure migrations metadata tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      );
    `);

    // 2. Fetch list of already applied migrations
    const appliedRes = await client.query('SELECT name FROM _migrations');
    const appliedNames = new Set(appliedRes.rows.map((r) => r.name));

    // 3. Locate migration SQL files
    const migrationsDir = path.resolve(__dirname);
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (appliedNames.has(file)) {
        results.push({
          name: file,
          status: 'skipped',
          durationMs: 0,
        });
        continue;
      }

      const start = Date.now();
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`Applying migration: ${file}...`);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');

        const durationMs = Date.now() - start;
        console.log(` Migration ${file} applied successfully in ${durationMs}ms`);
        results.push({
          name: file,
          status: 'applied',
          durationMs,
        });
      } catch (err: any) {
        await client.query('ROLLBACK');
        const durationMs = Date.now() - start;
        console.error(`❌ Migration ${file} failed:`, err);
        results.push({
          name: file,
          status: 'failed',
          error: err.message,
          durationMs,
        });
        return { success: false, results };
      }
    }

    return { success: true, results };
  } finally {
    client.release();
  }
}

// Direct execution via CLI: tsx server/migrations/runner.ts
if (process.argv[1]?.includes('runner.ts')) {
  runMigrations()
    .then((res) => {
      if (res.success) {
        console.log('All migrations completed successfully.');
        process.exit(0);
      } else {
        console.error('Migration runner finished with errors.');
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error('Fatal migration error:', err);
      process.exit(1);
    });
}
