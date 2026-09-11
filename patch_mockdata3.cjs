const fs = require('fs');
let code = fs.readFileSync('src/lib/googleSheets.ts', 'utf8');

code = code.replace(/person\.name\.toLowerCase\(\)/g, "(person.name || '').toLowerCase()");
code = code.replace(/name\.toLowerCase\(\)/g, "(name || '').toLowerCase()");

fs.writeFileSync('src/lib/googleSheets.ts', code, 'utf8');
