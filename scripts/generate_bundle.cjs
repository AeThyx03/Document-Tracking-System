const fs = require('fs');
const path = require('path');

const files = [
  'package.json',
  'vite.config.ts',
  'index.html',
  'src/types.ts',
  'src/lib/googleSheets.ts',
  'src/lib/timeInDesk.ts',
  'src/lib/sheetMapping.ts',
  'src/lib/firebase.ts',
  'src/lib/api.ts',
  'src/mockData.ts',
  'src/components/AdminSettingsView.tsx',
  'src/components/DedicatedLinksView.tsx',
  'src/components/DocumentAnalyticsDashboard.tsx',
  'src/components/DocumentAuditTrail.tsx',
  'src/components/DocumentDetailModal.tsx',
  'src/components/DocumentLifecycleProgress.tsx',
  'src/components/GoogleSheetSyncModal.tsx',
  'src/components/IncomingDocumentModal.tsx',
  'src/components/KeyboardShortcutsModal.tsx',
  'src/components/LoginModal.tsx',
  'src/components/NotificationCenter.tsx',
  'src/components/PossdLogo.tsx',
  'src/components/PWAInstallButton.tsx',
  'src/components/RolesManagementModal.tsx',
  'src/components/TimeInDeskConfigModal.tsx',
  'src/components/VerticalNavigationSidebar.tsx',
  'src/components/usePWAInstall.ts',
  'src/main.tsx',
  'src/App.tsx'
];

let output = '# POSSD Document Tracking System - Consolidated Full Codebase Export\n\n';
output += '> **Notice for Gemini Code Review:**\n';
output += '> This file contains the complete source code of the application compiled into a single document for analysis, debugging, and verification.\n\n';
output += '## Table of Contents\n\n';

files.forEach((f, idx) => {
  output += `${idx + 1}. \`${f}\`\n`;
});

output += '\n---\n\n';

for (const file of files) {
  if (fs.existsSync(file)) {
    const ext = path.extname(file).replace('.', '');
    const lang = ext === 'tsx' || ext === 'ts' ? 'typescript' : ext === 'json' ? 'json' : ext === 'html' ? 'html' : 'text';
    const content = fs.readFileSync(file, 'utf8');
    const lineCount = content.split('\n').length;
    output += `## File: \`${file}\` (${lineCount} lines)\n\n`;
    output += '```' + lang + '\n';
    output += content;
    if (!content.endsWith('\n')) output += '\n';
    output += '```\n\n---\n\n';
  }
}

fs.writeFileSync('FULL_CODEBASE_CONSOLIDATED.md', output, 'utf8');
fs.writeFileSync('public/FULL_CODEBASE_CONSOLIDATED.md', output, 'utf8');
fs.writeFileSync('public/codebase-export.txt', output, 'utf8');
console.log('Successfully generated FULL_CODEBASE_CONSOLIDATED.md and public copies');
console.log('Total file size:', (fs.statSync('FULL_CODEBASE_CONSOLIDATED.md').size / 1024).toFixed(2), 'KB');
