import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverPath = path.join(__dirname, '../server.ts');
let content = fs.readFileSync(serverPath, 'utf8');

const newRoutes = `
  // PHASE 8: Reports Endpoints
  
  app.get("/api/reports/traceability", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(400).json({ error: "No company context" });
      const { itemId, poId } = req.query;

      // Base query for item flow: Item -> PR -> PO -> GRN -> Invoice -> Asset
      let query = db.select({
         itemId: inventory_items.id,
         itemCode: inventory_items.itemCode,
         itemName: inventory_items.name,
         prId: requisition_items.requisitionId,
         poId: po_items.poId,
         grnId: grn_items.grnId,
         invoiceId: invoice_items.invoiceId,
         assetId: assets.id,
         assetCode: assets.assetCode
      })
      .from(inventory_items)
      .leftJoin(requisition_items, eq(requisition_items.itemId, inventory_items.id))
      .leftJoin(po_items, eq(po_items.itemId, inventory_items.id))
      .leftJoin(grn_items, eq(grn_items.itemId, inventory_items.id))
      .leftJoin(invoice_items, eq(invoice_items.poItemId, po_items.id))
      .leftJoin(assets, eq(assets.poItemId, po_items.id))
      .where(eq(inventory_items.companyId, companyId));

      if (itemId) query.where(eq(inventory_items.id, Number(itemId)));
      if (poId) query.where(eq(po_items.poId, Number(poId)));

      const data = await query;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/reports/grni", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(400).json({ error: "No company context" });

      // GRN items that have no matching invoice items
      const data = await db.execute(sql\`
        SELECT 
          g.grn_number,
          g.created_at as grn_date,
          gi.id as grn_item_id,
          ii.name as item_name,
          gi.quantity,
          gi.unit_price,
          (gi.quantity * gi.unit_price) as expected_liability
        FROM grn g
        JOIN grn_items gi ON g.id = gi.grn_id
        JOIN inventory_items ii ON gi.item_id = ii.id
        LEFT JOIN invoice_items invi ON invi.po_item_id = gi.po_item_id
        WHERE g.company_id = \${companyId}
          AND g.status = 'Approved'
          AND invi.id IS NULL
      \`);
      res.json(data.rows || data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/reports/invoiced-not-received", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(400).json({ error: "No company context" });

      // Invoice items that have no matching GRN items
      const data = await db.execute(sql\`
        SELECT 
          i.invoice_number,
          i.invoice_date,
          ii.id as invoice_item_id,
          inv_items.name as item_name,
          ii.quantity,
          ii.unit_price,
          ii.line_total
        FROM invoices i
        JOIN invoice_items ii ON i.id = ii.invoice_id
        JOIN inventory_items inv_items ON ii.item_id = inv_items.id
        LEFT JOIN grn_items gi ON gi.po_item_id = ii.po_item_id
        WHERE i.company_id = \${companyId}
          AND i.status = 'Approved'
          AND gi.id IS NULL
      \`);
      res.json(data.rows || data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/assets/pending-capitalization", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(400).json({ error: "No company context" });
      
      const data = await db.select().from(assets)
        .where(and(
           eq(assets.companyId, companyId),
           eq(assets.isCapitalized, false),
           eq(assets.status, 'Draft')
        ));
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/reports/unmapped-po-lines", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(400).json({ error: "No company context" });

      const data = await db.execute(sql\`
        SELECT 
          p.po_number,
          pi.id as po_item_id,
          ii.name as item_name,
          pi.quantity,
          pi.unit_price
        FROM purchase_orders p
        JOIN po_items pi ON p.id = pi.po_id
        JOIN inventory_items ii ON pi.item_id = ii.id
        LEFT JOIN grn_items gi ON gi.po_item_id = pi.id
        LEFT JOIN invoice_items invi ON invi.po_item_id = pi.id
        WHERE p.company_id = \${companyId}
          AND p.status = 'Approved'
          AND gi.id IS NULL 
          AND invi.id IS NULL
      \`);
      res.json(data.rows || data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/reports/expiring-licences", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(400).json({ error: "No company context" });
      const days = Number(req.query.days || 30);

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);

      const data = await db.execute(sql\`
        SELECT 
          da.id,
          ii.name as software_name,
          da.expiry_date,
          da.status,
          da.total_seats,
          da.used_seats
        FROM digital_assets da
        JOIN inventory_items ii ON da.item_id = ii.id
        WHERE da.company_id = \${companyId}
          AND da.status = 'Active'
          AND da.expiry_date <= \${targetDate.toISOString()}
      \`);
      res.json(data.rows || data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/reports/seat-overallocation", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(400).json({ error: "No company context" });

      const data = await db.execute(sql\`
        SELECT 
          da.id,
          ii.name as software_name,
          da.total_seats,
          da.used_seats,
          (da.used_seats - da.total_seats) as over_allocated_by
        FROM digital_assets da
        JOIN inventory_items ii ON da.item_id = ii.id
        WHERE da.company_id = \${companyId}
          AND da.used_seats > da.total_seats
      \`);
      res.json(data.rows || data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

`;

const targetString = `    app.listen(PORT, "0.0.0.0", () => {`;
if (!content.includes(targetString)) {
    console.error("Target string not found!");
    process.exit(1);
}

content = content.replace(targetString, newRoutes + targetString);
fs.writeFileSync(serverPath, content, 'utf8');
console.log('Successfully injected report routes');
