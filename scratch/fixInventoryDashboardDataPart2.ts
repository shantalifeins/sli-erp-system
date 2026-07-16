import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '../src/shared/db/index.js';
import { companies, inventory_items, stock_transactions, grn, purchase_orders, users, warehouses } from '../src/shared/db/schema.js';
import { eq, ilike } from 'drizzle-orm';

function generateNumber(prefix: string) {
  return `${prefix}-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
}

async function run() {
  try {
    const companyRows = await db.select().from(companies).where(ilike(companies.name, '%abc%'));
    if (companyRows.length === 0) return;
    const companyId = companyRows[0].id;

    const items = await db.select().from(inventory_items).where(eq(inventory_items.companyId, companyId));
    
    // 1. Trigger Low Stock Alerts by modifying 2 items
    if (items.length >= 2) {
      await db.update(inventory_items).set({ reorderLevel: 50, quantityInStock: 5 }).where(eq(inventory_items.id, items[0].id));
      await db.update(inventory_items).set({ reorderLevel: 200, quantityInStock: 15 }).where(eq(inventory_items.id, items[1].id));
    }

    // 2. Spread transactions over the last 6 months for the chart
    const transactions = await db.select().from(stock_transactions).where(eq(stock_transactions.companyId, companyId));
    
    for (let i = 0; i < transactions.length; i++) {
        // distribute them randomly in the last 6 months
        const randomMonthOffset = Math.floor(Math.random() * 6);
        const date = new Date();
        date.setMonth(date.getMonth() - randomMonthOffset);
        
        // Fix transaction type so Inbound is properly registered (GRN or Return)
        let newType = transactions[i].transactionType;
        if (newType === 'Stock In') newType = 'GRN'; // Convert generic Stock In to GRN for inbound
        if (newType === 'Stock Out') newType = 'Issue'; // Outbound

        await db.update(stock_transactions)
            .set({ 
                createdAt: date,
                transactionType: newType
            })
            .where(eq(stock_transactions.id, transactions[i].id));
    }

    // 3. Add more Recent Goods Receipts
    const pos = await db.select().from(purchase_orders).where(eq(purchase_orders.companyId, companyId));
    const whs = await db.select().from(warehouses).where(eq(warehouses.companyId, companyId));
    const u = await db.select().from(users).where(eq(users.companyId, companyId));

    if (pos.length > 0 && whs.length > 0 && u.length > 0) {
        for (let i = 0; i < 4; i++) {
            await db.insert(grn).values({
                companyId,
                warehouseId: whs[0].id,
                grnNumber: generateNumber('GRN'),
                poId: pos[i % pos.length].id, // reuse pos
                receivedBy: u[0].uid,
                status: 'QC Completed'
            });
        }
    }

    console.log("Inventory dashboard metrics generated successfully.");
  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

run();
