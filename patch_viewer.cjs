const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "role: 'Viewer',                                  email: authedUser.email",
  "role: 'Viewer', division: 'General', username: authedUser.email.split('@')[0], email: authedUser.email"
);

fs.writeFileSync('src/App.tsx', code, 'utf8');
