const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/currentUser\.avatarInitials/g, 'currentUser?.avatarInitials');
code = code.replace(/currentUser\?\.name\.slice/g, 'currentUser?.name?.slice');
// also some `addNotification` calls need to ensure the third parameter is not undefined since it expects string.
// Actually, `addNotification` was expecting `string` and `currentUser?.name` is `string | undefined`.
// Let's use `currentUser?.name || 'System'` for the third argument of addNotification.
code = code.replace(/currentUser\?\.name,/g, "currentUser?.name || 'System',");
code = code.replace(/currentUser\?\.name\)/g, "currentUser?.name || 'System')");

fs.writeFileSync('src/App.tsx', code, 'utf8');
