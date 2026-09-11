const fs = require('fs');
let code = fs.readFileSync('src/components/GoogleSheetSyncModal.tsx', 'utf8');

const hooksToMove = `
  const [appsScriptUrlInput, setAppsScriptUrlInput] = useState<string>(sheetConfig?.appsScriptUrl || '');
  const [copiedScript, setCopiedScript] = useState(false);
  const [showAppsScriptPanel, setShowAppsScriptPanel] = useState(false);
`;

// Remove them from their current location
code = code.replace(hooksToMove, "");

// Add them right before `if (!isOpen) return null;`
code = code.replace(
  "if (!isOpen) return null;",
  "const [appsScriptUrlInput, setAppsScriptUrlInput] = useState<string>(sheetConfig?.appsScriptUrl || '');\n  const [copiedScript, setCopiedScript] = useState(false);\n  const [showAppsScriptPanel, setShowAppsScriptPanel] = useState(false);\n\n  if (!isOpen) return null;"
);

fs.writeFileSync('src/components/GoogleSheetSyncModal.tsx', code, 'utf8');
