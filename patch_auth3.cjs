const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

code = code.replace(
  'const idToken = await user.getIdToken();\n            cachedAccessToken = idToken;',
  '// Since we need OAuth token and not ID token for Google Sheets, if the token is lost from session, we cannot retrieve the OAuth token from just getIdToken() which is a Firebase JWT.\n            // We must prompt the user to re-authenticate or they will be signed out from spreadsheet capability.\n            // However, we just return the user for now. Google Sheet writes might fail and prompt re-auth.\n            cachedAccessToken = null;'
);

fs.writeFileSync('src/lib/firebase.ts', code, 'utf8');
