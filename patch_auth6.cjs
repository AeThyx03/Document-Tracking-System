const fs = require('fs');
let code = fs.readFileSync('src/lib/api.ts', 'utf8');

code = code.replace(
  'const token = getAccessToken();\n  if (!token) throw new Error("Not authenticated");',
  `import { auth } from "./firebase";\n  const token = await auth.currentUser?.getIdToken();\n  if (!token) throw new Error("Not authenticated with Firebase");`
);
// Make sure to remove the old import if it's there
code = code.replace('import { getAccessToken } from "./firebase";', '');

fs.writeFileSync('src/lib/api.ts', code, 'utf8');
