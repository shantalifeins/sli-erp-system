const fs = require('fs');
const text = '\n### 20. Dynamic Notifications\n- **Web and Email Notifications**: Never hardcode email or web notifications. Any new notification logic MUST be added to `DEFAULT_NOTIFICATION_TEMPLATES` in `server.ts` so that it is dynamically manageable in the UI via the `notification_settings` table and menu.\n';
fs.appendFileSync('.agents/AGENTS.md', text);
console.log('Appended to .agents/AGENTS.md');
