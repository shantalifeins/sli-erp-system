const fs = require('fs');
const path = require('path');

const devGuideAdd = `
### Profile Data Change Requests
- **Dynamic BPMN Workflow**: Profile updates (such as changing a phone number, department, designation, office, supervisor, or role) are not direct \`UPDATE\` queries. They are submitted as drafts to the \`profile_change_requests\` table and routed via the dynamic BPMN engine under \`documentType: 'Profile Data Change Request'\`.
- **Inbox Final Step Override**: When the request reaches the final approver (e.g., HR) in the Global Inbox, the \`Inbox.tsx\` UI exposes the requested fields in an editable form. The final approver can override any requested data (such as assigning a different role or supervisor) before clicking "Approve Updates".
- **Automatic Fulfillment**: Upon final approval, the backend automatically merges the approved data into the \`users\` table, updates role assignments, sends an email notification to the user, and marks all related inbox tasks as completed.
`;

const agentsAdd = `
### 17. Profile Data Change Architecture
- **Dynamic Workflow**: Profile change requests **must** go through the BPMN engine (\`documentType: 'Profile Data Change Request'\`).
- **Inbox Final Step Modification**: In the Global Inbox UI (\`Inbox.tsx\`), the final approver must be able to view **and edit/override** the requested profile fields (Role, Department, Designation, Branch, Supervisor, Phone) before final approval. 
- **Auto-Update**: The final approval API handler must seamlessly merge the approved data directly into the \`users\` table, ensuring role permissions and cascading foreign keys are respected, and then notify the user.
`;

try {
  let devGuide = fs.readFileSync('DEVELOPER_GUIDE.md', 'utf8');
  if (!devGuide.includes('Profile Data Change Requests')) {
    fs.appendFileSync('DEVELOPER_GUIDE.md', '\n' + devGuideAdd);
  }
} catch (e) { console.error('Error updating DEVELOPER_GUIDE.md', e); }

try {
  let agents = fs.readFileSync('.agents/AGENTS.md', 'utf8');
  if (!agents.includes('Profile Data Change Architecture')) {
    fs.appendFileSync('.agents/AGENTS.md', '\n' + agentsAdd);
  }
} catch (e) { console.error('Error updating .agents/AGENTS.md', e); }
