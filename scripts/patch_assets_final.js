import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, '../src/modules/assets/pages/Assets.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add Activity, Users to lucide-react import
if (!content.includes("Activity,")) {
    content = content.replace(
        "} from 'lucide-react';",
        ", Activity, Users } from 'lucide-react';"
    );
}

// 2. Add useAuth to components
content = content.replace(
    /function ProcurementTracePanel\(\{ asset \}: \{ asset: any \}\) \{/g,
    `function ProcurementTracePanel({ asset }: { asset: any }) {\n  const { getToken } = useAuth();`
);

content = content.replace(
    /function AssignmentHistoryPanel\(\{ assetId, users, departments, branches \}: any\) \{/g,
    `function AssignmentHistoryPanel({ assetId, users, departments, branches }: any) {\n  const { getToken } = useAuth();`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully patched Assets.tsx again');
