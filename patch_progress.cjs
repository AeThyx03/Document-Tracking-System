const fs = require('fs');
let code = fs.readFileSync('src/components/DocumentLifecycleProgress.tsx', 'utf8');

// I need to make sure the tooltip text is computed in both map loops, or use a helper function.
// Let's add a helper function at the top of the component.
const helperInjection = `
  const getStageTooltip = (s, isPassed, isCurrent) => {
    let text = \`\${s.label}: \${isPassed ? 'Completed' : isCurrent ? 'Current Stage' : 'Pending'}\`;
    if (s.id === 'received' && document.dateReceived) {
       text += \` on \${document.dateReceived} \${document.timeReceived || ''}\`;
    } else if (s.id === 'review' && document.internalMovements?.length) {
       const lastMov = document.internalMovements[document.internalMovements.length - 1];
       text += \`\\nLast updated: \${new Date(lastMov.timestamp).toLocaleString()}\\nLocation: \${lastMov.currentDesk}\`;
    } else if (s.id === 'complied' && document.supervisorRemarks?.length) {
       const lastRemark = document.supervisorRemarks[document.supervisorRemarks.length - 1];
       text += \`\\nDirective: "\${lastRemark.remarkText}"\\nBy: \${lastRemark.supervisorName}\`;
    } else if (s.id === 'cleared' && document.managerClearance?.isCleared) {
       text += \`\\nCleared on \${new Date(document.managerClearance.clearedAt).toLocaleString()}\\nBy: \${document.managerClearance.clearedBy}\`;
    }
    return text;
  };
`;

code = code.replace("const stage = getLifecycleStage(document);", "const stage = getLifecycleStage(document);" + helperInjection);

// Replace title={tooltipText} with title={getStageTooltip(s, isPassed, isCurrent)}
code = code.replace(/title={tooltipText}/g, "title={getStageTooltip(s, isPassed, isCurrent)}");
code = code.replace(/title=\{\`\$\{s\.label\}: \$\{isPassed \? 'Completed' : isCurrent \? 'Current Stage' : 'Pending'\}\`\}/g, "title={getStageTooltip(s, isPassed, isCurrent)}");

// Remove the injected block from the second loop
const brokenBlock = `let tooltipText = \`\${s.label}: \${isPassed ? 'Completed' : isCurrent ? 'Current Stage' : 'Pending'}\`;
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
            }`;

code = code.replace(brokenBlock, "");

fs.writeFileSync('src/components/DocumentLifecycleProgress.tsx', code, 'utf8');
