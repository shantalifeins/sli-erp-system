import { db } from '../src/shared/db/index.js';
import { sql } from 'drizzle-orm';
import { 
  inventory_items, 
  stock_transactions, 
  global_stock_ledger, 
  warehouse_stock 
} from '../src/shared/db/schema.js';

async function runReconciliation() {
  console.log('Starting Stock Ledger Reconciliation...');
  try {
    // 1. Compare legacy inventory_items.quantityInStock vs global_stock_ledger.closingBalance
    const legacyMismatchResult = await db.execute(sql`
      SELECT 
        ii.id as item_id, ii.name as item_name, ii.company_id,
        COALESCE(ii.quantity_in_stock, 0) as legacy_qty,
        COALESCE(gsl.closing_balance, 0) as ledger_qty
      FROM inventory_items ii
      LEFT JOIN global_stock_ledger gsl ON ii.id = gsl.item_id AND ii.company_id = gsl.company_id
      WHERE COALESCE(ii.quantity_in_stock, 0) != COALESCE(gsl.closing_balance, 0)
    `);
    const legacyMismatch = (legacyMismatchResult as any).rows || legacyMismatchResult;
    
    if (legacyMismatch.length > 0) {
       console.warn(`[WARNING] Found ${legacyMismatch.length} items with legacy vs ledger mismatch.`);
       console.table(legacyMismatch);
    } else {
       console.log('[OK] Legacy inventory_items matches global_stock_ledger perfectly.');
    }

    // 2. Compare sum(warehouse_stock.quantity) vs global_stock_ledger
    const warehouseMismatchResult = await db.execute(sql`
      WITH ws_sum AS (
        SELECT company_id, item_id, SUM(quantity) as total_ws_qty
        FROM warehouse_stock
        GROUP BY company_id, item_id
      )
      SELECT 
        gsl.item_id, gsl.company_id,
        gsl.closing_balance as ledger_qty,
        COALESCE(ws_sum.total_ws_qty, 0) as total_ws_qty
      FROM global_stock_ledger gsl
      LEFT JOIN ws_sum ON gsl.item_id = ws_sum.item_id AND gsl.company_id = ws_sum.company_id
      WHERE COALESCE(gsl.closing_balance, 0) != COALESCE(ws_sum.total_ws_qty, 0)
    `);
    const warehouseMismatch = (warehouseMismatchResult as any).rows || warehouseMismatchResult;

    if (warehouseMismatch.length > 0) {
       console.warn(`[WARNING] Found ${warehouseMismatch.length} items with warehouse_stock vs ledger mismatch.`);
       console.table(warehouseMismatch);
    } else {
       console.log('[OK] sum(warehouse_stock) matches global_stock_ledger perfectly.');
    }

    // 3. Double-tracked items (Tracked capitalized assets vs consumable stock)
    const invalidStockTypesResult = await db.execute(sql`
      SELECT 
        ii.id as item_id, ii.name as item_name,
        gsl.closing_balance
      FROM inventory_items ii
      JOIN global_stock_ledger gsl ON ii.id = gsl.item_id
      WHERE (ii.is_fixed_asset = true OR ii.is_digital_asset = true)
        AND gsl.closing_balance > 0
    `);
    const invalidStockTypes = (invalidStockTypesResult as any).rows || invalidStockTypesResult;

    if (invalidStockTypes.length > 0) {
       console.warn(`[WARNING] Found ${invalidStockTypes.length} Assets/Digital Assets that are incorrectly tracked as consumable stock!`);
       console.table(invalidStockTypes);
       console.log('Action needed: These should be removed from stock_ledger as they are tracked via Asset Register individually.');
    } else {
       console.log('[OK] No double-tracked Assets in consumable stock ledger.');
    }

  } catch (err) {
    console.error('Reconciliation failed:', err);
  } finally {
    process.exit(0);
  }
}

runReconciliation();
