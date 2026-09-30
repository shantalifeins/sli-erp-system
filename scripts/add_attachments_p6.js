import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function addAttachmentPanel(filePath, type, idVar) {
  const file = path.join(__dirname, filePath);
  if (!fs.existsSync(file)) return;
  
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes("AttachmentPanel")) return;
  
  // 1. Import
  content = content.replace(
    "import {",
    "import AttachmentPanel from '@/src/shared/components/AttachmentPanel';\nimport {"
  );
  
  // 2. Add to UI
  if (filePath.includes("PurchaseRequisitions.tsx")) {
    content = content.replace(
      /{activeTab === 'details' && \(/,
      `{activeTab === 'details' && (\n                        <div className="mb-6"><AttachmentPanel refType="PR" refId={${idVar}} compact /></div>`
    );
  } else if (filePath.includes("StockIn.tsx")) {
    content = content.replace(
      /<\/form>/,
      `</form>\n              </div>\n              {/* Note: StockIn creates the record onSubmit. Attachments should be on the transaction record viewing. Currently StockIn doesn't have a detail view, so we skip it here. */}`
    );
  } else if (filePath.includes("DigitalAssets.tsx")) {
    content = content.replace(
      /<\/div>\s*<\/div>\s*<\/div>\s*\)\}\s*<\/div>/,
      `</div></div><div className="mt-6"><AttachmentPanel refType="DigitalAsset" refId={${idVar}} compact /></div></div>)}</div>`
    );
  }
  
  fs.writeFileSync(file, content, 'utf8');
  console.log('Added attachments to', filePath);
}

addAttachmentPanel('../src/modules/procurement/pages/PurchaseRequisitions.tsx', 'PR', 'viewingPrId');
addAttachmentPanel('../src/modules/inventory/pages/StockIn.tsx', 'StockIn', 'null');
addAttachmentPanel('../src/modules/digitalAssets/pages/DigitalAssets.tsx', 'DigitalAsset', 'viewingAssetId');
