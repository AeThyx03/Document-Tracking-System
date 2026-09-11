const fs = require('fs');
let code = fs.readFileSync('src/components/RolesManagementModal.tsx', 'utf8');

// There are a few .toLowerCase() calls there. Let's make sure it's safe.
code = code.replace(/newName\.trim\(\)\.toLowerCase\(\)/g, "(newName || '').trim().toLowerCase()");
code = code.replace(/r\.toLowerCase\(\) === trimmed\.toLowerCase\(\)/g, "(r || '').toLowerCase() === trimmed.toLowerCase()");
code = code.replace(/d\.toLowerCase\(\) === trimmed\.toLowerCase\(\)/g, "(d || '').toLowerCase() === trimmed.toLowerCase()");
code = code.replace(/quickName\.toLowerCase\(\)/g, "(quickName || '').toLowerCase()");
code = code.replace(/newName\.toLowerCase\(\)/g, "(newName || '').toLowerCase()");
code = code.replace(/staff\.name\.toLowerCase\(\)/g, "(staff.name || '').toLowerCase()");

fs.writeFileSync('src/components/RolesManagementModal.tsx', code, 'utf8');
