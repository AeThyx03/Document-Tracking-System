const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "let matchedStaff = currentStaffList.find(s => s.email === authedUser.email || (s.name.includes('Rey Reginald') && authedUser.email === 'reymojica01@gmail.com'));",
  "let matchedStaff = currentStaffList.find(s => s.email === authedUser.email || ((s.name || '').includes('Rey Reginald') && authedUser.email === 'reymojica01@gmail.com'));"
);

fs.writeFileSync('src/App.tsx', code, 'utf8');
