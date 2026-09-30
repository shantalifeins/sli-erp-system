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
    if (qty <= 0) return;

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
        openingBalance: 0,
        totalStockIn: qty,
        totalStockOut: 0,
        closingBalance: qty,
        lastUpdated: new Date()
      });
    } else {
      await tx.update(global_stock_ledger)
        .set({
          totalStockIn: (ledger[0].totalStockIn || 0) + qty,
          closingBalance: (ledger[0].closingBalance || 0) + qty,
          lastUpdated: new Date()
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
        quantity: qty,
        lastUpdated: new Date()
      });
    } else {
      await tx.update(warehouse_stock)
        .set({
          quantity: (ws[0].quantity || 0) + qty,
          lastUpdated: new Date()
        })
        .where(eq(warehouse_stock.id, ws[0].id));
    }
    
    // Update legacy inventory_items.quantityInStock for backwards compatibility until it's fully deprecated
    await tx.update(inventory_items).set({
        quantityInStock: sql`COALESCE(quantity_in_stock, 0) + ${qty}`
    }).where(eq(inventory_items.id, itemId));
  },

  async moveOut(
    tx: any, 
    companyId: string, 
    warehouseId: number, 
    itemId: number, 
    qty: number, 
    refId: string, 
    refType: string,
    performedBy: string
  ) {
    if (qty <= 0) throw new Error('Quantity must be greater than zero');

    // Fetch warehouse stock to verify availability
    const ws = await tx.select().from(warehouse_stock).where(and(eq(warehouse_stock.companyId, companyId), eq(warehouse_stock.warehouseId, warehouseId), eq(warehouse_stock.itemId, itemId))).limit(1);
    if (ws.length === 0 || (ws[0].quantity || 0) < qty) {
      throw new Error(`Insufficient stock in warehouse for item ${itemId}`);
    }

    // 1. Write stock_transaction
    await tx.insert(stock_transactions).values({
      companyId,
      itemId,
      warehouseId,
      transactionType: 'Stock Out',
      referenceType: refType,
      referenceId: refId,
      quantity: qty,
      unitCost: '0',
      performedBy,
      transactionDate: new Date()
    });

    // 2. Update global_stock_ledger
    await tx.update(global_stock_ledger)
        .set({
          totalStockOut: sql`total_stock_out + ${qty}`,
          closingBalance: sql`closing_balance - ${qty}`,
          lastUpdated: new Date()
        })
        .where(and(eq(global_stock_ledger.companyId, companyId), eq(global_stock_ledger.itemId, itemId)));

    // 3. Update warehouse_stock
    await tx.update(warehouse_stock)
        .set({
          quantity: (ws[0].quantity || 0) - qty,
          lastUpdated: new Date()
        })
        .where(eq(warehouse_stock.id, ws[0].id));
    
    // Update legacy inventory_items.quantityInStock for backwards compatibility
    await tx.update(inventory_items).set({
        quantityInStock: sql`COALESCE(quantity_in_stock, 0) - ${qty}`
    }).where(eq(inventory_items.id, itemId));
  },

  async adjustStock(
    tx: any, 
    companyId: string, 
    warehouseId: number, 
    itemId: number, 
    qtyDiff: number, // Positive for adjustment in, negative for adjustment out
    refId: string, 
    performedBy: string
  ) {
     if (qtyDiff > 0) {
        await this.moveIn(tx, companyId, warehouseId, itemId, qtyDiff, refId, 'Adjustment', performedBy);
     } else if (qtyDiff < 0) {
        await this.moveOut(tx, companyId, warehouseId, itemId, Math.abs(qtyDiff), refId, 'Adjustment', performedBy);
     }
  }
};
