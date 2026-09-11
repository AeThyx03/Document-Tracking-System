const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

code = code.replace(
  'const idToken = await result.user.getIdToken();\n    cachedAccessToken = idToken;',
  `const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    if (!token) throw new Error('No Google OAuth access token returned');
    cachedAccessToken = token;`
);

fs.writeFileSync('src/lib/firebase.ts', code, 'utf8');
