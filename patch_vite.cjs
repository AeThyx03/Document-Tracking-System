const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf8');

// Add chunkSizeWarningLimit to build options
if (!code.includes('chunkSizeWarningLimit')) {
  code = code.replace(
    'server: {',
    'build: {\n      chunkSizeWarningLimit: 3000,\n    },\n    server: {'
  );
}

// Add suppressWarnings to devOptions
if (!code.includes('suppressWarnings')) {
  code = code.replace(
    "enabled: true,",
    "enabled: true,\n          suppressWarnings: true,"
  );
}

fs.writeFileSync('vite.config.ts', code, 'utf8');
