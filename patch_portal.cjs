const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/<span className="text-\[10px\] font-bold tracking-wide px-2 py-0\.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">\s*Official Portal\s*<\/span>/g, "");

fs.writeFileSync('src/App.tsx', code, 'utf8');
