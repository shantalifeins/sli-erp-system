const fs = require('fs');
let code = fs.readFileSync('src/modules/userPanel/pages/Profile.tsx', 'utf8');

// The modal HTML
const modalStart = '{isEditModalOpen && (';
let count = code.split(modalStart).length - 1;

// Replace the first occurrence (which is inside Alert)
if (count > 0) {
  // Find the exact block in Alert and remove it
  const alertStart = 'function Alert({ alert, onClose }: { alert: AlertType; onClose: () => void }) {';
  const profileStart = 'export default function Profile() {';
  let beforeProfile = code.substring(0, code.indexOf(profileStart));
  let afterProfile = code.substring(code.indexOf(profileStart));
  
  // Clean up Alert
  beforeProfile = beforeProfile.replace(/\{\s*isEditModalOpen && \([\s\S]*?\)\s*\}/, '');
  
  // Recombine
  code = beforeProfile + afterProfile;
}

// Write it back
fs.writeFileSync('src/modules/userPanel/pages/Profile.tsx', code);
