const fs = require('fs');
let code = fs.readFileSync('src/components/LoginModal.tsx', 'utf8');

code = code.replace(
  'await googleSignIn({ staySignedIn: true });\n      // initAuth in App.tsx will handle the state update',
  'const result = await googleSignIn({ staySignedIn: true });\n      if (result) {\n        // initAuth handles the main state update, but we can also forcefully call onLoginSuccess if we can construct the user\n        // Actually, we should just let initAuth handle it, but we can remove the loading state once complete\n      }'
);

fs.writeFileSync('src/components/LoginModal.tsx', code, 'utf8');
