const fs = require('fs');
let code = fs.readFileSync('server/db/index.ts', 'utf-8');
code = code.replace(
  /export function getPoolConfig\(\): PoolConfig \{[\s\S]*?return \{[\s\S]*?connectionString: process\.env\.DATABASE_URL,[\s\S]*?max: 15,[\s\S]*?connectionTimeoutMillis: 15000,[\s\S]*?idleTimeoutMillis: 30000,[\s\S]*?\};\n\}/,
  `export function getPoolConfig(): PoolConfig {
  if (!process.env.DATABASE_URL) {
    if (process.env.SQL_HOST && process.env.SQL_USER && process.env.SQL_DB_NAME) {
      const host = process.env.SQL_HOST;
      const user = process.env.SQL_USER;
      const pass = process.env.SQL_PASSWORD || '';
      const dbName = process.env.SQL_DB_NAME;
      if (host.startsWith('/')) {
        process.env.DATABASE_URL = \`postgresql://\${user}:\${pass}@localhost/\${dbName}?host=\${host}\`;
      } else {
        process.env.DATABASE_URL = \`postgresql://\${user}:\${pass}@\${host}/\${dbName}\`;
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
}`
);
fs.writeFileSync('server/db/index.ts', code);
