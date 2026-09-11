const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/key=\{doc\.id \|\| \`doc-\$\{_idx_doc\}\`\}/g, 'key={`${doc.id}-${_idx_doc}`}');
code = code.replace(/key=\{tab\.id \|\| \`tab-\$\{_idx_tab\}\`\}/g, 'key={`${tab.id}-${_idx_tab}`}');
code = code.replace(/key=\{s\.id \|\| \`s-\$\{_idx_s\}\`\}/g, 'key={`${s.id}-${_idx_s}`}');
code = code.replace(/key=\{dept \|\| \`dept-\$\{_idx_dept\}\`\}/g, 'key={`${dept}-${_idx_dept}`}');
code = code.replace(/key=\{div \|\| \`div-\$\{_idx_div\}\`\}/g, 'key={`${div}-${_idx_div}`}');

fs.writeFileSync('src/App.tsx', code, 'utf8');
