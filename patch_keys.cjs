const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace key={tab.id} with key={tab.id || \`tab-\${idx}\`}
code = code.replace(/\.map\(\(tab\) => \{/g, '.map((tab, _idx_tab) => {');
code = code.replace(/key=\{tab\.id\}/g, 'key={tab.id || `tab-${_idx_tab}`}');

// Replace key={doc.id} with key={doc.id || \`doc-\${idx}\`}
code = code.replace(/\.map\(doc => \(/g, '.map((doc, _idx_doc) => (');
code = code.replace(/\.map\(\(doc\) => \{/g, '.map((doc, _idx_doc) => {');
code = code.replace(/key=\{doc\.id\}/g, 'key={doc.id || `doc-${_idx_doc}`}');

// Replace key={s.id} with key={s.id || \`s-\${idx}\`}
code = code.replace(/\.map\(\(s\) => \(/g, '.map((s, _idx_s) => (');
code = code.replace(/key=\{s\.id\}/g, 'key={s.id || `s-${_idx_s}`}');

// Replace key={dept} with key={dept || \`dept-\${idx}\`}
code = code.replace(/\.map\(\(dept\) => \(/g, '.map((dept, _idx_dept) => (');
code = code.replace(/key=\{dept\}/g, 'key={dept || `dept-${_idx_dept}`}');

// Replace key={div} with key={div || \`div-\${idx}\`}
code = code.replace(/\.map\(\(div\) => \(/g, '.map((div, _idx_div) => (');
code = code.replace(/key=\{div\}/g, 'key={div || `div-${_idx_div}`}');

fs.writeFileSync('src/App.tsx', code, 'utf8');
