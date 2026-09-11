const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "type: 'incoming' | 'movement' | 'remark' | 'compliance' | 'clearance' | 'sync',\\n    trackingNumber: string",
  "type: 'incoming' | 'movement' | 'remark' | 'compliance' | 'clearance' | 'sync' | 'urgent',\\n    trackingNumber?: string"
);

fs.writeFileSync('src/App.tsx', code, 'utf8');
