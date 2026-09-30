import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, '../src/modules/assets/pages/Assets.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add handleCapitalize function
const handleCapitalizeStr = `
  const handleCapitalize = async (id: string) => {
    if (!window.confirm("Are you sure you want to capitalize this asset? This will lock its cost and start depreciation.")) return;
    try {
      const token = await getToken();
      const res = await fetch(\`/api/assets/\${id}/capitalize\`, {
        method: 'POST',
        headers: { Authorization: \`Bearer \${token}\` }
      });
      if (!res.ok) throw new Error(await res.text());
      loadData();
    } catch (err: any) {
      alert("Failed to capitalize: " + err.message);
    }
  };
`;

if (!content.includes('handleCapitalize =')) {
    content = content.replace("const handleOpenCreate = () => {", handleCapitalizeStr + "\n  const handleOpenCreate = () => {");
}

// 2. Add icon to lucide-react import
if (!content.includes("DollarSign")) {
    content = content.replace("import { Box, Plus", "import { Box, Plus, DollarSign");
}

// 3. Add the button to the row actions
const buttonStr = `
                              {!asset.isCapitalized && (
                                <button
                                  onClick={() => handleCapitalize(asset.id)}
                                  className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Capitalize Asset"
                                >
                                  <DollarSign className="w-4 h-4" />
                                </button>
                              )}
`;

if (!content.includes("Capitalize Asset")) {
    content = content.replace(
        '<button\n                                onClick={() => handleOpenEdit(asset)}',
        buttonStr + '<button\n                                onClick={() => handleOpenEdit(asset)}'
    );
}

fs.writeFileSync(file, content, 'utf8');
console.log('Patched Assets.tsx to add Capitalize button');
