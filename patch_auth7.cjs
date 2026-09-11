const fs = require('fs');
let code = fs.readFileSync('src/lib/api.ts', 'utf8');

code = code.replace(
  'import { auth } from "./firebase";',
  ''
);

if (!code.includes('import { auth } from "./firebase";')) {
  code = 'import { auth } from "./firebase";\n' + code;
}

fs.writeFileSync('src/lib/api.ts', code, 'utf8');
