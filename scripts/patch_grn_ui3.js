import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, '../src/modules/inventory/pages/Grn.tsx');
let content = fs.readFileSync(file, 'utf8');

// Add state for serials
content = content.replace(
  /const \[receiveQtys, setReceiveQtys\] = useState<\{ \[poItemId: number\]: number \}>\({}\);/,
  `const [receiveQtys, setReceiveQtys] = useState<{ [poItemId: number]: number }>({});\n  const [receiveSerials, setReceiveSerials] = useState<{ [poItemId: number]: string }>({});`
);

// Reset serials on close
content = content.replace(
  /setReceiveQtys\({}\);/g,
  `setReceiveQtys({});\n                        setReceiveSerials({});`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Patched state in Grn.tsx');
