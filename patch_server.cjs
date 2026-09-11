const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  'const data = await callAppsScript("saveDocument", req.body, "POST");',
  'const data = await callAppsScript(req.body.action, req.body.payload, "POST");'
);

code = code.replace(
  'const data = await callAppsScript("saveStaff", req.body, "POST");',
  'const data = await callAppsScript(req.body.action, req.body.payload, "POST");'
);

code = code.replace(
  'const data = await callAppsScript("logAudit", req.body, "POST");',
  'const data = await callAppsScript("logAudit", req.body, "POST");' // req.body is already payload
);

code = code.replace(
  'const data = await callAppsScript("saveLinks", req.body, "POST");',
  'const data = await callAppsScript("saveLinks", req.body, "POST");' // req.body is already payload
);

fs.writeFileSync('server.ts', code, 'utf8');
