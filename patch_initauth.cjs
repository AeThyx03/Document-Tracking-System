const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/fetch\('\/api\/links', \{ headers: \{ Authorization: `Bearer \$\{oauthToken\}` \} \}\)\.then\(r => r\.json\(\)\)\.then\(r => r\.data\)/g, "api.fetchLinks()");

fs.writeFileSync('src/App.tsx', code, 'utf8');
