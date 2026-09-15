const fs = require('fs');
let code = fs.readFileSync('server/routes/auth.ts', 'utf-8');
code = code.replace(
  /const isProduction = process\.env\.NODE_ENV === 'production';/,
  `const isProduction = process.env.NODE_ENV === 'production';\nconst authMode = process.env.AUTH_MODE || (isProduction ? 'postgres' : 'development');`
);
fs.writeFileSync('server/routes/auth.ts', code);
