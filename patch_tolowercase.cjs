const fs = require('fs');

function replaceSafeLower(filePath) {
    let code = fs.readFileSync(filePath, 'utf8');
    
    // Replace typical undefined/null prone .toLowerCase() with safe (var || '').toLowerCase()
    
    // App.tsx
    code = code.replace(/doc\.trackingNumber\.toLowerCase\(\)/g, "(doc.trackingNumber || '').toLowerCase()");
    code = code.replace(/doc\.title\.toLowerCase\(\)/g, "(doc.title || '').toLowerCase()");
    code = code.replace(/doc\.originDepartment\.toLowerCase\(\)/g, "(doc.originDepartment || '').toLowerCase()");
    code = code.replace(/doc\.responsiblePerson\.toLowerCase\(\)/g, "(doc.responsiblePerson || '').toLowerCase()");
    code = code.replace(/doc\.targetDivision\.toLowerCase\(\)/g, "(doc.targetDivision || '').toLowerCase()");
    code = code.replace(/doc\.currentLocation\.toLowerCase\(\)/g, "(doc.currentLocation || '').toLowerCase()");
    
    // DocumentAuditTrail.tsx
    code = code.replace(/ev\.actorName\.toLowerCase\(\)/g, "(ev.actorName || '').toLowerCase()");
    code = code.replace(/ev\.actionTitle\.toLowerCase\(\)/g, "(ev.actionTitle || '').toLowerCase()");
    code = code.replace(/ev\.actorRole\.toLowerCase\(\)/g, "(ev.actorRole || '').toLowerCase()");
    
    // DedicatedLinksView.tsx
    code = code.replace(/l\.title\.toLowerCase\(\)/g, "(l.title || '').toLowerCase()");
    code = code.replace(/l\.url\.toLowerCase\(\)/g, "(l.url || '').toLowerCase()");
    
    // RoleManagementModal.tsx
    code = code.replace(/trimmed\.toLowerCase\(\)/g, "(trimmed || '').toLowerCase()");
    
    // googleSheets.ts
    code = code.replace(/rawDocType\.toLowerCase\(\)/g, "(rawDocType || '').toLowerCase()");
    code = code.replace(/preferredMasterName\.toLowerCase\(\)/g, "(preferredMasterName || '').toLowerCase()");
    code = code.replace(/MASTER_TAB_NAME\.toLowerCase\(\)/g, "(MASTER_TAB_NAME || '').toLowerCase()");
    code = code.replace(/PERSONNEL_TAB_NAME\.toLowerCase\(\)/g, "(PERSONNEL_TAB_NAME || '').toLowerCase()");
    code = code.replace(/searchQuery\.toLowerCase\(\)/g, "(searchQuery || '').toLowerCase()"); // App, etc

    fs.writeFileSync(filePath, code, 'utf8');
}

['src/App.tsx', 'src/components/DocumentAuditTrail.tsx', 'src/components/DedicatedLinksView.tsx', 'src/components/RolesManagementModal.tsx', 'src/lib/googleSheets.ts'].forEach(replaceSafeLower);

