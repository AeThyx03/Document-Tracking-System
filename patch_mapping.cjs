const fs = require('fs');
let code = fs.readFileSync('src/lib/sheetMapping.ts', 'utf8');

code = code.replace(
  "currentCustodian: doc.currentCustodian || '',",
  "currentCustodian: doc.currentCustodian || '',\\n      targetDivision: doc.targetDivision || '',\\n      currentStatus: doc.currentStatus || 'Incoming Logged',\\n      currentLocation: doc.currentLocation || '',\\n      createdAt: doc.createdAt || new Date().toISOString(),\\n      updatedAt: doc.updatedAt || new Date().toISOString(),"
);

code = code.replace(
  "currentCustodian: row.currentCustodian || '',",
  "currentCustodian: row.currentCustodian || '',\\n      targetDivision: row.targetDivision || '',\\n      currentStatus: row.currentStatus || 'Incoming Logged',\\n      currentLocation: row.currentLocation || '',\\n      createdAt: row.createdAt || new Date().toISOString(),\\n      updatedAt: row.updatedAt || new Date().toISOString(),"
);

fs.writeFileSync('src/lib/sheetMapping.ts', code, 'utf8');
