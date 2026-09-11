const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

// When user tries to sign in, they sign in via googleSignIn.
// googleSignIn updates cachedAccessToken.
// onAuthStateChanged (initAuth) listens for this.
// If googleSignIn is successful, it returns user and token, which we aren't using because App.tsx relies on initAuth.

code = code.replace(
  'if (cachedAccessToken) {\n        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);\n      } else if (!isSigningIn) {\n        // If user is authenticated in Firebase but OAuth token has expired or not stored\n        if (onAuthFailure) onAuthFailure();\n      }',
  `if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // If we don't have the token, let's just get it since the user is authenticated in firebase
        try {
            const idToken = await user.getIdToken();
            cachedAccessToken = idToken;
            saveStoredToken(idToken, getStaySignedIn());
            if (onAuthSuccess) onAuthSuccess(user, idToken);
        } catch (e) {
            console.warn("Failed to get token", e);
            if (!isSigningIn && onAuthFailure) onAuthFailure();
        }
      }`
);

fs.writeFileSync('src/lib/firebase.ts', code, 'utf8');
