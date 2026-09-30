import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, '../server.ts');
let content = fs.readFileSync(file, 'utf8');

// 1. Update GET /api/purchase to include assetNature, trackingMethod
content = content.replace(
  /const allPoItems = await db\.select\(\)\.from\(po_items\);/,
  `const allPoItems = await db.select().from(po_items);
      const allInvItems = await db.select().from(inventory_items).where(eq(inventory_items.companyId, companyId));`
);
content = content.replace(
  /items: allPoItems\.filter\(\(i\) => i\.poId === p\.id\),/,
  `items: allPoItems.filter((i) => i.poId === p.id).map(pi => {
            const inv = allInvItems.find(ii => ii.id === pi.itemId);
            return {
              ...pi,
              assetNature: inv?.assetNature || 'Physical',
              trackingMethod: inv?.trackingMethod || 'None',
              requiresQc: inv?.requiresQc !== false
            };
          }),`
);

// 2. Update handleGrnStockAddition signature
content = content.replace(
  /async function handleGrnStockAddition\(\s*companyId: string,\s*warehouseId: number,\s*grnItemId: number,\s*newlyPassed: number,\s*reqUserUid: string,\s*\)/,
  `async function handleGrnStockAddition(
  companyId: string,
  warehouseId: number,
  grnItemId: number,
  newlyPassed: number,
  reqUserUid: string,
  serials?: string[]
)`
);
content = content.replace(
  /grnItemId,\s*poItemId: grnItemResult\[0\]\.poItemId,\s*passedQty: newlyPassed,\s*},/,
  `grnItemId,
          poItemId: grnItemResult[0].poItemId,
          passedQty: newlyPassed,
          serials
        },`
);

// 3. Update POST /api/grn to pass serials
content = content.replace(
  /await handleGrnStockAddition\(\s*companyId,\s*warehouseId,\s*newGrnItem\.id,\s*i\.quantityReceived,\s*req\.user!\.uid,\s*\);/,
  `await handleGrnStockAddition(
                companyId,
                warehouseId,
                newGrnItem.id,
                i.quantityReceived,
                req.user!.uid,
                i.serials
              );`
);

// 4. Update POST /api/qc/inspection to accept and pass serials
content = content.replace(
  /const { grnItemId, inspectedQty, passedQty, failedQty, remarks } = req\.body;/,
  `const { grnItemId, inspectedQty, passedQty, failedQty, remarks, serials } = req.body;`
);
content = content.replace(
  /await handleGrnStockAddition\(\s*companyId,\s*warehouseId,\s*grnItemId,\s*newlyPassed,\s*req\.user!\.uid,\s*\);/,
  `await handleGrnStockAddition(
                companyId,
                warehouseId,
                grnItemId,
                newlyPassed,
                req.user!.uid,
                serials
              );`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Patched server.ts successfully');
