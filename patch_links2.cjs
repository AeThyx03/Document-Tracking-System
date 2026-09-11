const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/fetch\('\/api\/links'\)\s*\.then\(\(res\) => res\.json\(\)\)\s*\.then\(\(data\) => \{\s*if \(data && data\.success && Array\.isArray\(data\.links\) && data\.links\.length > 0\) \{\s*setDedicatedLinks\(data\.links\);\s*try \{\s*localStorage\.setItem\('possd_dedicated_links', JSON\.stringify\(data\.links\)\);\s*\} catch \{\}\s*\}\s*\}\)\s*\.catch\(\(err\) => console\.warn\('Could not fetch server links:', err\)\);/g, "api.fetchLinks().then(data => { if (Array.isArray(data)) setDedicatedLinks(data); }).catch(e => console.warn(e));");

fs.writeFileSync('src/App.tsx', code, 'utf8');
