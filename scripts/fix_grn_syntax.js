import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, '../src/modules/inventory/pages/Grn.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /poItemId: parseInt\(poItemId\),\s*quantityReceived: receiveQtys\[parseInt\(poItemId\)\] \|\| 0\s*}\)\);/g,
  `poItemId: parseInt(poItemId),
          quantityReceived: receiveQtys[parseInt(poItemId)] || 0,
          serials
        };
      });`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed Grn.tsx');
