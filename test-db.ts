import { pool } from './server/db/index.ts';
async function test() {
  await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS uid, DROP COLUMN IF EXISTS firebase_uid');
  console.log('done');
  process.exit(0);
}
test();
