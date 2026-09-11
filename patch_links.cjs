const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/fetch\('\/api\/links', \{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(\{ links: updated \}\),\s*\}\)\.catch\(\(e\) => console\.warn\('Failed to push link to server:', e\)\);/g, "api.saveLinks(updated).catch((e) => console.warn('Failed to push link to server:', e));");

fs.writeFileSync('src/App.tsx', code, 'utf8');
