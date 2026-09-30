import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverPath = path.join(__dirname, '../server.ts');
let content = fs.readFileSync(serverPath, 'utf8');

// 1. Add import
if (!content.includes("import { stockService } from")) {
    content = content.replace(
        "import { resolveTenantId } from './src/shared/middleware/tenant.js';",
        "import { resolveTenantId } from './src/shared/middleware/tenant.js';\nimport { stockService } from './src/modules/inventory/services/stockService.js';"
    );
}

// 2. Fix /api/inventory/stock-in
const stockInRegex = /app\.post\("\/api\/inventory\/stock-in", requireAuth, async \(req: AuthRequest, res\) => {[\s\S]*?(?=\/\/ Record transaction)[\s\S]*?res\.json\({ message: "Stock received successfully", transactionId: newTx\[0\]\.id }\);\s+} catch \(error: any\) {/g;

const newStockIn = `app.post("/api/inventory/stock-in", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(400).json({ error: "No company context" });

      const { itemId, quantity, remarks, warehouseId, vendorId } = req.body;
      if (!itemId || !quantity || !warehouseId) return res.status(400).json({ error: "Missing required fields" });

      const dbUserResult = await db.select().from(users).where(eq(users.uid, req.user!.uid)).limit(1);
      const dbUser = dbUserResult[0];

      if (dbUser) {
        const hasAccess = await verifyWarehouseAccess(dbUser.uid, dbUser.role, Number(warehouseId), [Number(itemId)]);
        if (!hasAccess) {
          return res.status(403).json({ error: "Forbidden: You are not assigned to manage this warehouse or item type." });
        }
      }

      // Check if it's a fixed asset or digital asset - reject manual stock in
      const item = await db.select().from(inventory_items).where(eq(inventory_items.id, itemId)).limit(1);
      if (!item.length) return res.status(404).json({ error: "Item not found" });
      if (item[0].isFixedAsset || item[0].isDigitalAsset) {
         return res.status(400).json({ error: "Manual stock-in is disabled for Tracked Assets and Digital Assets. Please use GRN or Requisition flow." });
      }

      await db.transaction(async (tx) => {
         await stockService.moveIn(
            tx, 
            companyId, 
            Number(warehouseId), 
            Number(itemId), 
            Number(quantity), 
            remarks || 'Manual Stock In', 
            'Manual', 
            req.user!.uid, 
            0
         );
      });

      res.json({ message: "Stock received successfully" });
    } catch (error: any) {`;

content = content.replace(stockInRegex, newStockIn);

// 3. Fix /api/inventory/stock-out approval block where the deduction happens
// We will replace the raw updates with a db.transaction and stockService.moveOut.
const stockOutExecuteRegex = /\/\/ ALL steps approved! Execute Stock Deduction[\s\S]*?await db\.update\(stock_reservations\)[\s\S]*?where\(eq\(stock_reservations\.stockOutRequestId, requestId\)\);[\s\S]*?res\.json\({ message: "Stock Out Request approved completely and stock deducted", request \}\);/g;

const newStockOutExecute = `// ALL steps approved! Execute Stock Deduction with reservation-aware check
          const item = await db.select().from(inventory_items).where(eq(inventory_items.id, request[0].itemId)).limit(1);
          
          if (!item.length) {
            await db.update(document_approvals).set({ status: 'Pending' }).where(eq(document_approvals.id, pendingStep.id));
            return res.status(400).json({ error: "Item not found in inventory." });
          }

          if (item[0].isFixedAsset || item[0].isDigitalAsset) {
             await db.update(document_approvals).set({ status: 'Pending' }).where(eq(document_approvals.id, pendingStep.id));
             return res.status(400).json({ error: "Consumable stock-out is not supported for Assets." });
          }

          // Phase 1: Check available stock = total - reserved (excluding THIS request's own reservation)
          const activeReservations = await db.select().from(stock_reservations).where(and(
            eq(stock_reservations.itemId, item[0].id),
            eq(stock_reservations.status, 'Active')
          ));
          const reservedByOthers = activeReservations
            .filter(r => r.stockOutRequestId !== requestId)
            .reduce((sum, r) => sum + (r.reservedQty || 0), 0);
          
          // Use warehouse_stock instead of inventory_items.quantityInStock for validation
          const ws = await db.select().from(warehouse_stock).where(and(eq(warehouse_stock.warehouseId, request[0].warehouseId), eq(warehouse_stock.itemId, item[0].id))).limit(1);
          const effectiveAvailable = (ws.length ? (ws[0].quantity || 0) : 0) - reservedByOthers;

          if (effectiveAvailable < request[0].quantity) {
            await db.update(document_approvals).set({ status: 'Pending' }).where(eq(document_approvals.id, pendingStep.id));
            return res.status(400).json({ 
              error: \`Insufficient available stock. Available: \${effectiveAvailable}, Requested: \${request[0].quantity}\` 
            });
          }

          try {
             await db.transaction(async (tx) => {
                await stockService.moveOut(
                   tx,
                   companyId,
                   request[0].warehouseId,
                   request[0].itemId,
                   request[0].quantity,
                   requestId.toString(),
                   'Stock Out',
                   req.user!.uid
                );
             });
          } catch (e: any) {
             await db.update(document_approvals).set({ status: 'Pending' }).where(eq(document_approvals.id, pendingStep.id));
             return res.status(400).json({ error: "Transaction failed: " + e.message });
          }

          await db.update(stock_out_requests).set({ status: 'Approved', updatedAt: new Date() }).where(eq(stock_out_requests.id, requestId));
          
          // Clear reservation
          await db.update(stock_reservations).set({ status: 'Fulfilled', updatedAt: new Date() }).where(eq(stock_reservations.stockOutRequestId, requestId));

          res.json({ message: "Stock Out Request approved completely and stock deducted", request });`;

content = content.replace(stockOutExecuteRegex, newStockOutExecute);

fs.writeFileSync(serverPath, content, 'utf8');
console.log('Successfully patched server.ts');
