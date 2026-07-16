const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

// 1. Update the type
serverCode = serverCode.replace(
  /export const DEFAULT_NOTIFICATION_TEMPLATES: Record<string, \{ module: string, titleTemplate: string, bodyTemplate: string, mailSubjectTemplate\?: string, mailBodyTemplate\?: string \}> = \{/,
  'export const DEFAULT_NOTIFICATION_TEMPLATES: Record<string, { module: string, titleTemplate: string, bodyTemplate: string, mailSubjectTemplate?: string, mailBodyTemplate?: string, recipient?: string }> = {'
);

// 2. Add recipients mapping based on event name
const recipientMap = {
  "User Created": "New User",
  "Profile Update Approved": "Requester",
  "Profile Update Rejected": "Requester",
  "Profile Update Required": "Approver",
  "Item Requisition Approval Required": "Approver",
  "Item Request Created": "Requester",
  "Item Requisition Created": "Requester",
  "PR Rejected": "Requester",
  "PR Revision Required": "Requester",
  "PR Approved": "Requester",
  "PR Approval Required": "Approver",
  "CS Evaluation Approval Required": "Approver",
  "PO Approval Required": "Approver",
  "PO Created": "Creator",
  "GRN Created": "Creator",
  "Invoice Created": "Creator",
  "Payment Created": "Creator",
  "Stock Transfer Created": "Creator",
  "Stock Out Approval Required": "Approver",
  "Stock Out Approved": "Requester",
  "Stock Out Rejected": "Requester",
  "Reorder Alert": "Warehouse Manager"
};

// Replace each template to include the recipient
for (const [event, recipient] of Object.entries(recipientMap)) {
  const regex = new RegExp(`("${event}":\\s*\\{\\s*module:\\s*"[^"]+",\\s*titleTemplate:\\s*"[^"]+",\\s*bodyTemplate:\\s*"[^"]+",\\s*mailSubjectTemplate:\\s*"[^"]+",\\s*mailBodyTemplate:\\s*"[^"]+"\\s*)(\\})`, 'g');
  
  // Need a more flexible regex because body templates can contain newlines and quotes.
  // Instead, let's just find the start of the object and insert the recipient inside.
}

// A simpler way: just append the recipient field before the closing brace of each object in DEFAULT_NOTIFICATION_TEMPLATES
let inTemplates = false;
let updatedCode = '';
let currentEvent = null;

const lines = serverCode.split('\n');
for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  if (line.includes('export const DEFAULT_NOTIFICATION_TEMPLATES')) {
    inTemplates = true;
  }
  
  if (inTemplates) {
    const match = line.match(/^\s*"([^"]+)":\s*\{/);
    if (match) {
      currentEvent = match[1];
    }
    
    // Check if this line is closing the object
    if (currentEvent && line.match(/^\s*\},?/)) {
      // Add the recipient before this closing brace
      const recipient = recipientMap[currentEvent] || "General";
      
      // Look back to the previous line to add a comma if it doesn't have one
      let prevLineIndex = updatedCode.split('\n').length - 1;
      let prevLines = updatedCode.split('\n');
      if (!prevLines[prevLineIndex].trim().endsWith(',')) {
        prevLines[prevLineIndex] += ',';
        updatedCode = prevLines.join('\n');
      }
      
      updatedCode += `    recipient: "${recipient}"\n`;
      currentEvent = null;
    }
  }
  
  if (inTemplates && line.trim() === '};' && !currentEvent) {
    inTemplates = false;
  }
  
  updatedCode += line + (i < lines.length - 1 ? '\n' : '');
}

// 3. Update GET /api/notification-settings
updatedCode = updatedCode.replace(
  /actionEvent,\n\s*module: defaultTemplate.module,/,
  "actionEvent,\n          module: defaultTemplate.module,\n          recipient: defaultTemplate.recipient || 'General',"
);

fs.writeFileSync('server.ts', updatedCode);
console.log('Updated server.ts');

// 4. Update frontend NotificationSettings.tsx
let uiCode = fs.readFileSync('src/modules/admin/pages/NotificationSettings.tsx', 'utf8');

// Add recipient to interface
uiCode = uiCode.replace(
  /module: string;/,
  'module: string;\n  recipient?: string;'
);

// Update table header (from 1/2 width to dynamic or adding a span)
// Find the row rendering the actionEvent and add a badge for recipient
uiCode = uiCode.replace(
  /<div className="font-medium text-gray-900">\{setting\.actionEvent\}<\/div>/,
  '<div className="font-medium text-gray-900 flex items-center space-x-2">\n                    <span>{setting.actionEvent}</span>\n                    {setting.recipient && (\n                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">\n                        {setting.recipient}\n                      </span>\n                    )}\n                  </div>'
);

fs.writeFileSync('src/modules/admin/pages/NotificationSettings.tsx', uiCode);
console.log('Updated NotificationSettings.tsx');
