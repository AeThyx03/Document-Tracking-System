const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

code = code.replace(
  '// However, we just return the user for now. Google Sheet writes might fail and prompt re-auth.\n            cachedAccessToken = null;\n            saveStoredToken(idToken, getStaySignedIn());\n            if (onAuthSuccess) onAuthSuccess(user, idToken);\n        } catch (e) {\n            console.warn("Failed to get token", e);\n            if (!isSigningIn && onAuthFailure) onAuthFailure();\n        }',
  '// However, we just return the user for now. Google Sheet writes might fail and prompt re-auth.\n            cachedAccessToken = null;\n            if (!isSigningIn && onAuthFailure) onAuthFailure();\n        } catch (e) {\n            if (!isSigningIn && onAuthFailure) onAuthFailure();\n        }'
);

fs.writeFileSync('src/lib/firebase.ts', code, 'utf8');
