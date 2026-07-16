const fs = require('fs');

function updateFile(path) {
  let code = fs.readFileSync(path, 'utf8');
  // Remove inline SearchableSelect
  code = code.replace(/function SearchableSelect[\s\S]*?\}\n\}\n/m, '');
  
  if (!code.includes('import SearchableSelect')) {
    code = code.replace(
      "import { useNavigate } from 'react-router-dom';",
      "import { useNavigate } from 'react-router-dom';\nimport SearchableSelect from '@/src/shared/components/SearchableSelect';"
    );
  }
  fs.writeFileSync(path, code, 'utf8');
  console.log(path + ' updated');
}

updateFile('src/modules/userPanel/pages/Profile.tsx');
try {
  updateFile('src/modules/inventory/pages/RequisitionReport.tsx');
} catch (e) {
  console.log("Could not update RequisitionReport.tsx", e.message);
}
