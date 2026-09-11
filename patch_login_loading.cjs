const fs = require('fs');
let code = fs.readFileSync('src/components/LoginModal.tsx', 'utf8');

code = code.replace(
  '// Actually, we should just let initAuth handle it, but we can remove the loading state once complete\n      }',
  '// Actually, we should just let initAuth handle it, but we can remove the loading state once complete\n        setIsLoading(false);\n      }'
);

fs.writeFileSync('src/components/LoginModal.tsx', code, 'utf8');
