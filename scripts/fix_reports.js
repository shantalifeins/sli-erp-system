import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverPath = path.join(__dirname, '../server.ts');
let content = fs.readFileSync(serverPath, 'utf8');

// 1. Add pr_items to imports
if (!content.includes("pr_items,")) {
    content = content.replace("po_items,", "po_items,\n  pr_items,");
}

// 2. Fix the Traceability route
const routeRegex = /app\.get\("\/api\/reports\/traceability"[\s\S]*?const data = await query;\n      res\.json\(data\);\n    } catch \(err: any\) {/g;

const newRoute = `app.get("/api/reports/traceability", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(400).json({ error: "No company context" });
      const { itemId, poId } = req.query;

      // Base query for item flow: Item -> PR -> PO -> GRN -> Invoice -> Asset
      const filters = [eq(inventory_items.companyId, companyId)];
      if (itemId) filters.push(eq(inventory_items.id, Number(itemId)));
      if (poId) filters.push(eq(po_items.poId, Number(poId)));

      const data = await db.select({
         itemId: inventory_items.id,
         itemCode: inventory_items.itemCode,
         itemName: inventory_items.name,
         prId: pr_items.prId,
         poId: po_items.poId,
         grnId: grn_items.grnId,
         invoiceId: invoice_items.invoiceId,
         assetId: assets.id,
         assetCode: assets.assetCode
      })
      .from(inventory_items)
      .leftJoin(pr_items, eq(pr_items.itemId, inventory_items.id))
      .leftJoin(po_items, eq(po_items.itemId, inventory_items.id))
      .leftJoin(grn_items, eq(grn_items.poItemId, po_items.id)) // Fixed grn_items join
      .leftJoin(invoice_items, eq(invoice_items.poItemId, po_items.id))
      .leftJoin(assets, eq(assets.poItemId, po_items.id))
      .where(and(...filters));

      res.json(data);
    } catch (err: any) {`;

content = content.replace(routeRegex, newRoute);

fs.writeFileSync(serverPath, content, 'utf8');
console.log('Successfully fixed report routes');
