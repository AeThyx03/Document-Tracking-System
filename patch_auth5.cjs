const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

// The issue might be that sign in throws an error because the iframe cannot redirect.
// Wait, the popup flow *is* supported but the iframe must have `allow-popups` attribute. 
// As the preview environment provides an iframe with allow-popups, signInWithPopup should work.
// Wait, what is the error message for "cant sign in"?

