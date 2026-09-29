import { db } from '../../../shared/db/index.js';
import { 
  inventory_items, 
  stock_transactions, 
  global_stock_ledger, 
  warehouse_stock 
} from '../../../shared/db/schema.js';
import { eq, and, sql } from 'drizzle-orm';

export const stockService = {
  async moveIn(
    tx: any, 
    companyId: string, 
    warehouseId: number, 
    itemId: number, 
    qty: number, 
    refId: string, 
    refType: string,
    performedBy: string,
    unitCost: number = 0
  ) {
    // 1. Write stock_transaction
    await tx.insert(stock_transactions).values({
      companyId,
      itemId,
      warehouseId,
      transactionType: 'Stock In',
      referenceType: refType,
      referenceId: refId,
      quantity: qty,
      unitCost: String(unitCost),
      performedBy,
      transactionDate: new Date()
    });

    // 2. Update global_stock_ledger
    const ledger = await tx.select().from(global_stock_ledger).where(and(eq(global_stock_ledger.companyId, companyId), eq(global_stock_ledger.itemId, itemId))).limit(1);
    if (ledger.length === 0) {
      await tx.insert(global_stock_ledger).values({
        companyId,
        itemId,
        quantityInStock: qty,
        weightedAverageCost: String(unitCost),
        lastUpdatedBy: performedBy,
        lastUpdatedAt: new Date()
      });
    } else {
      const currentQty = ledger[0].quantityInStock || 0;
      const currentWAC = parseFloat(ledger[0].weightedAverageCost || '0');
      const newQty = currentQty + qty;
      const newWAC = newQty > 0 ? ((currentQty * currentWAC) + (qty * unitCost)) / newQty : currentWAC;
      
      await tx.update(global_stock_ledger)
        .set({
          quantityInStock: newQty,
          weightedAverageCost: String(newWAC),
          lastUpdatedBy: performedBy,
          lastUpdatedAt: new Date()
        })
        .where(eq(global_stock_ledger.id, ledger[0].id));
    }

    // 3. Update warehouse_stock
    const ws = await tx.select().from(warehouse_stock).where(and(eq(warehouse_stock.companyId, companyId), eq(warehouse_stock.warehouseId, warehouseId), eq(warehouse_stock.itemId, itemId))).limit(1);
    if (ws.length === 0) {
      await tx.insert(warehouse_stock).values({
        companyId,
        warehouseId,
        itemId,
        quantityInStock: qty,
        lastUpdatedBy: performedBy,
        lastUpdatedAt: new Date()
      });
    } else {
      await tx.update(warehouse_stock)
        .set({
          quantityInStock: (ws[0].quantityInStock || 0) + qty,
          lastUpdatedBy: performedBy,
          lastUpdatedAt: new Date()
        })
        .where(eq(warehouse_stock.id, ws[0].id));
    }
    
    // Update legacy inventory_items.quantityInStock for backwards compatibility until it's fully deprecated
    await tx.update(inventory_items).set({
        quantityInStock: sql`COALESCE(quantity_in_stock, 0) + ${qty}`
    }).where(eq(inventory_items.id, itemId));
  }
};
