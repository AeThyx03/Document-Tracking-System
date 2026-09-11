const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/currentUser\.role/g, 'currentUser?.role');
code = code.replace(/currentUser\.name/g, 'currentUser?.name');
code = code.replace(/currentUser\?\.\?\./g, 'currentUser?.'); // Just in case

fs.writeFileSync('src/App.tsx', code, 'utf8');
