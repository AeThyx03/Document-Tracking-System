const fs = require('fs');
let code = fs.readFileSync('src/components/DocumentLifecycleProgress.tsx', 'utf8');

// I will insert a helper to compute tooltip text inside the map loop
const target = `const isCurrent = idx === stage.stageIndex;
            const isPassed = idx < stage.stageIndex;

            return (`;
const replacement = `const isCurrent = idx === stage.stageIndex;
            const isPassed = idx < stage.stageIndex;

            let tooltipText = \`\${s.label}: \${isPassed ? 'Completed' : isCurrent ? 'Current Stage' : 'Pending'}\`;
            if (s.id === 'received' && document.dateReceived) {
               tooltipText += \` on \${document.dateReceived} \${document.timeReceived || ''}\`;
            } else if (s.id === 'review' && document.internalMovements?.length) {
               const lastMov = document.internalMovements[document.internalMovements.length - 1];
               tooltipText += \`\\nLast updated: \${new Date(lastMov.timestamp).toLocaleString()}\\nLocation: \${lastMov.currentDesk}\`;
            } else if (s.id === 'complied' && document.supervisorRemarks?.length) {
               const lastRemark = document.supervisorRemarks[document.supervisorRemarks.length - 1];
               tooltipText += \`\\nDirective: "\${lastRemark.remarkText}"\\nBy: \${lastRemark.supervisorName}\`;
            } else if (s.id === 'cleared' && document.managerClearance?.isCleared) {
               tooltipText += \`\\nCleared on \${new Date(document.managerClearance.clearedAt!).toLocaleString()}\\nBy: \${document.managerClearance.clearedBy}\`;
            }

            return (`;

code = code.replace(target, replacement);

const target2 = `title={\`\${s.label}: \${isPassed ? 'Completed' : isCurrent ? 'Current Stage' : 'Pending'}\`}`;
const replacement2 = `title={tooltipText}`;
code = code.replace(target2, replacement2);

fs.writeFileSync('src/components/DocumentLifecycleProgress.tsx', code, 'utf8');
