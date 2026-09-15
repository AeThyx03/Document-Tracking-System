const fs = require('fs');
let code = fs.readFileSync('src/mockData.ts', 'utf-8');

code = code.replace(
  /export function broadcastDataUpdate\(\) \{[\s\S]*?\}\n/,
  `export function broadcastDataUpdate(type: string, data: any) {
  window.dispatchEvent(new CustomEvent('possd-data-update', { detail: { type, data } }));
}\n`
);

code = code.replace(
  /export function onDataUpdate\(callback: \(type: string, data: any\) => void\) \{[\s\S]*?\}\n/,
  `export function onDataUpdate(callback: (type: string, data: any) => void) {
  const handler = (e: any) => callback(e.detail?.type, e.detail?.data);
  window.addEventListener('possd-data-update', handler);
  return () => window.removeEventListener('possd-data-update', handler);
}\n`
);

fs.writeFileSync('src/mockData.ts', code);
