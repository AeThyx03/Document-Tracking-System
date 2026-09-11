const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/currentUser\.division/g, 'currentUser?.division');
code = code.replace(/currentUser\.id/g, 'currentUser?.id');

fs.writeFileSync('src/App.tsx', code, 'utf8');
