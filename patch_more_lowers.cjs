const fs = require('fs');

function replaceSafeLower(filePath) {
    let code = fs.readFileSync(filePath, 'utf8');
    
    // Replace typical undefined/null prone .toLowerCase() with safe (var || '').toLowerCase()
    
    // DocumentAuditTrail.tsx
    code = code.replace(/ev\.notes\?\.toLowerCase\(\)/g, "(ev.notes || '').toLowerCase()");
    code = code.replace(/ev\.fromDesk\?\.toLowerCase\(\)/g, "(ev.fromDesk || '').toLowerCase()");
    code = code.replace(/ev\.toDesk\?\.toLowerCase\(\)/g, "(ev.toDesk || '').toLowerCase()");
    
    // DedicatedLinksView.tsx
    code = code.replace(/l\.description\.toLowerCase\(\)/g, "(l.description || '').toLowerCase()");
    code = code.replace(/l\.targetDivision\.toLowerCase\(\)/g, "(l.targetDivision || '').toLowerCase()");
    
    // googleSheets.ts
    code = code.replace(/summary\.toLowerCase\(\)/g, "(summary || '').toLowerCase()");

    fs.writeFileSync(filePath, code, 'utf8');
}

['src/components/DocumentAuditTrail.tsx', 'src/components/DedicatedLinksView.tsx', 'src/lib/googleSheets.ts'].forEach(replaceSafeLower);

