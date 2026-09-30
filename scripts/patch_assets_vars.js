import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, '../src/modules/assets/pages/Assets.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Fix imports
if (content.includes("Users, Activity, FileText } from 'lucide-react'")) {
    // already there?
} else if (content.includes("Users, Activity")) {
    content = content.replace("Users, Activity", "Users, Activity, FileText");
} else if (content.includes("Users,")) {
    content = content.replace("Users,", "Users, Activity, FileText,");
}

// 2. Fix ProcurementTracePanel token
content = content.replace(
    /function ProcurementTracePanel\(\{ asset, token \}: \{ asset: any, token: string \}\) \{/g,
    `function ProcurementTracePanel({ asset }: { asset: any }) {`
);
content = content.replace(
    /fetch\(url, \{ headers: \{ Authorization: \`Bearer \$\{token\}\` \} \}\)/g,
    `getToken().then(token => fetch(url, { headers: { Authorization: \`Bearer \$\{token\}\` } })`
);
content = content.replace(
    /\.finally\(\(\) => setLoading\(false\)\);/g,
    `.finally(() => setLoading(false)))`
);
// Fix the dependency array
content = content.replace(
    /}, \[asset, token\]\);/g,
    `}, [asset]);`
);

// 3. Fix AssignmentHistoryPanel token
content = content.replace(
    /function AssignmentHistoryPanel\(\{ assetId, token, users, departments, branches \}: any\) \{/g,
    `function AssignmentHistoryPanel({ assetId, users, departments, branches }: any) {`
);

content = content.replace(
    /fetch\(\`\/api\/assets\/\$\{assetId\}\/assignments\`, \{ headers: \{ Authorization: \`Bearer \$\{token\}\` \} \}\)/g,
    `getToken().then(token => fetch(\`/api/assets/\$\{assetId\}/assignments\`, { headers: { Authorization: \`Bearer \$\{token\}\` } })`
);

content = content.replace(
    /const res = await fetch\(\`\/api\/assets\/\$\{assetId\}\/assign\`, \{/g,
    `const token = await getToken();\n         const res = await fetch(\`/api/assets/\$\{assetId\}/assign\`, {`
);

content = content.replace(
    /const res = await fetch\(\`\/api\/assets\/\$\{assetId\}\/return\`, \{/g,
    `const token = await getToken();\n         const res = await fetch(\`/api/assets/\$\{assetId\}/return\`, {`
);

content = content.replace(
    /const asset = data\.find\(a => a\.id === viewingAssetId\);/g,
    `const asset = assetsList.find(a => a.id === viewingAssetId);`
);
content = content.replace(
    /const asset = assets\.find\(a => a\.id === viewingAssetId\);/g,
    `const asset = assetsList.find(a => a.id === viewingAssetId);`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully patched Assets.tsx variables');
