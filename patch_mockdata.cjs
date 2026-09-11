const fs = require('fs');
let code = fs.readFileSync('src/mockData.ts', 'utf8');

code = code.replace(
  'const defaultUsername = staff.username || (\n            staff.name.toLowerCase().replace(/[^a-z0-9]/g, \'.\').replace(/\\.+/g, \'.\').replace(/^\\.|\\.$/g, \'\') ||\n            `user${idx + 1}`\n          );',
  `const defaultUsername = staff.username || (
            (staff.name || '').toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\\.+/g, '.').replace(/^\\.|\\.$/g, '') ||
            \`user\${idx + 1}\`
          );`
);

fs.writeFileSync('src/mockData.ts', code, 'utf8');
