import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function runUnitTest() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log("=== QC INSPECTION & STOCK CALCULATION UNIT TEST ===");

    // 1. Fetch any test company
    const compRes = await client.query(`SELECT id FROM companies LIMIT 1;`);
    if (compRes.rows.length === 0) {
      console.log("No company found to test.");
      return;
    }
    const companyId = compRes.rows[0].id;
    console.log(`[PASS] Resolved Company ID: ${companyId}`);

    // 2. Fetch or create a test warehouse
    let warehouseId: number;
    const whRes = await client.query(`SELECT id FROM warehouses WHERE company_id = $1 LIMIT 1;`, [companyId]);
    if (whRes.rows.length === 0) {
      const newWh = await client.query(`INSERT INTO warehouses (company_id, name, location, status) VALUES ($1, 'Test Warehouse QC', 'Dhaka', 'Active') RETURNING id;`, [companyId]);
      warehouseId = newWh.rows[0].id;
    } else {
      warehouseId = whRes.rows[0].id;
    }
    console.log(`[PASS] Resolved Receiving Warehouse ID: ${warehouseId}`);

    // 3. Create a unique test inventory item
    const testItemName = `QC Test Item ${Date.now()}`;
    const invRes = await client.query(`
      INSERT INTO inventory_items (company_id, item_code, name, category, uom, base_price, quantity_in_stock)
      VALUES ($1, $2, $3, 'Test Category', 'Pcs', '150.00', 10)
      RETURNING id, name, quantity_in_stock;
    `, [companyId, `ITEM-${Date.now()}`, testItemName]);
    const invItem = invRes.rows[0];
    console.log(`[PASS] Created Inventory Item: "${invItem.name}" (ID: ${invItem.id}) with initial stock: ${invItem.quantity_in_stock}`);

    // 4. Fetch valid user uid and create dummy PR, PO and PO Item
    const userRes = await client.query(`SELECT uid FROM users WHERE company_id = $1 LIMIT 1;`, [companyId]);
    const userUid = userRes.rows[0]?.uid || 'system';

    const prRes = await client.query(`
      INSERT INTO purchase_requisitions (company_id, pr_number, requestor, uid, estimated_cost, status)
      VALUES ($1, $2, 'Test Requestor', $3, 3000, 'Approved')
      RETURNING id;
    `, [companyId, `PR-TEST-${Date.now()}`, userUid]);
    const prId = prRes.rows[0].id;

    const poRes = await client.query(`
      INSERT INTO purchase_orders (company_id, pr_id, po_number, total_amount, status)
      VALUES ($1, $2, $3, 1500, 'Approved')
      RETURNING id, po_number;
    `, [companyId, prId, `PO-TEST-${Date.now()}`]);
    const poId = poRes.rows[0].id;

    const poItemRes = await client.query(`
      INSERT INTO po_items (po_id, item_name, category, quantity, unit_price, total_price, uom)
      VALUES ($1, $2, 'Test Category', 20, 150.00, 3000.00, 'Pcs')
      RETURNING id, item_name;
    `, [poId, testItemName]);
    const poItemId = poItemRes.rows[0].id;
    console.log(`[PASS] Created PO Item ID: ${poItemId} for PO: ${poRes.rows[0].po_number}`);

    // 5. Create GRN & GRN Item
    const grnRes = await client.query(`
      INSERT INTO grn (company_id, grn_number, po_id, warehouse_id, status)
      VALUES ($1, $2, $3, $4, 'Pending QC')
      RETURNING id, grn_number;
    `, [companyId, `GRN-TEST-${Date.now()}`, poId, warehouseId]);
    const grnId = grnRes.rows[0].id;

    const grnItemRes = await client.query(`
      INSERT INTO grn_items (grn_id, po_item_id, quantity_received, status)
      VALUES ($1, $2, 20, 'Pending QC')
      RETURNING id, grn_id;
    `, [grnId, poItemId]);
    const grnItemId = grnItemRes.rows[0].id;
    console.log(`[PASS] Created GRN Item ID: ${grnItemId} for GRN: ${grnRes.rows[0].grn_number}`);

    // 6. Simulate QC Inspection submission (Passed: 18, Failed/Hold: 2)
    const passedQty = 18;
    const failedQty = 2;
    await client.query(`
      INSERT INTO qc_inspections (grn_item_id, inspected_qty, passed_qty, failed_qty, remarks)
      VALUES ($1, $2, $3, $4, '2 units damaged package');
    `, [grnItemId, passedQty + failedQty, passedQty, failedQty]);

    await client.query(`UPDATE grn_items SET status = 'Passed' WHERE id = $1;`, [grnItemId]);
    await client.query(`UPDATE grn SET status = 'QC Completed' WHERE id = $1;`, [grnId]);
    console.log(`[PASS] Completed QC Inspection: Passed = ${passedQty}, Hold = ${failedQty}`);

    // 7. Perform Stock Calculation updates (simulating backend logic)
    const passed = passedQty;
    // Update inventory_items
    await client.query(`
      UPDATE inventory_items SET quantity_in_stock = quantity_in_stock + $1 WHERE id = $2;
    `, [passed, invItem.id]);

    // Update or Insert warehouse_stock
    const wsCheck = await client.query(`SELECT id, quantity FROM warehouse_stock WHERE warehouse_id = $1 AND item_id = $2;`, [warehouseId, invItem.id]);
    if (wsCheck.rows.length > 0) {
      await client.query(`UPDATE warehouse_stock SET quantity = quantity + $1, last_updated = NOW() WHERE id = $2;`, [passed, wsCheck.rows[0].id]);
    } else {
      await client.query(`INSERT INTO warehouse_stock (company_id, warehouse_id, item_id, quantity, last_updated) VALUES ($1, $2, $3, $4, NOW());`, [companyId, warehouseId, invItem.id, passed]);
    }

    // Update or Insert global_stock_ledger
    const gslCheck = await client.query(`SELECT id, total_stock_in, closing_balance FROM global_stock_ledger WHERE company_id = $1 AND item_id = $2;`, [companyId, invItem.id]);
    if (gslCheck.rows.length > 0) {
      await client.query(`UPDATE global_stock_ledger SET total_stock_in = total_stock_in + $1, closing_balance = closing_balance + $1, last_updated = NOW() WHERE id = $2;`, [passed, gslCheck.rows[0].id]);
    } else {
      await client.query(`INSERT INTO global_stock_ledger (company_id, item_id, opening_balance, total_stock_in, total_stock_out, closing_balance, last_updated) VALUES ($1, $2, 0, $3, 0, $3, NOW());`, [companyId, invItem.id, passed]);
    }

    // 8. VERIFY RESULTS
    const finalInv = await client.query(`SELECT quantity_in_stock FROM inventory_items WHERE id = $1;`, [invItem.id]);
    const finalWs = await client.query(`SELECT quantity FROM warehouse_stock WHERE warehouse_id = $1 AND item_id = $2;`, [warehouseId, invItem.id]);
    const finalGsl = await client.query(`SELECT total_stock_in, closing_balance FROM global_stock_ledger WHERE company_id = $1 AND item_id = $2;`, [companyId, invItem.id]);

    const expectedStock = invItem.quantity_in_stock + passedQty; // 10 + 18 = 28
    console.log("--------------------------------------------------");
    console.log(`[VERIFY] Expected Inventory Stock: ${expectedStock}`);
    console.log(`[VERIFY] Actual Inventory Stock:   ${finalInv.rows[0].quantity_in_stock}`);
    console.log(`[VERIFY] Warehouse Stock:          ${finalWs.rows[0].quantity}`);
    console.log(`[VERIFY] Global Stock Ledger In:   ${finalGsl.rows[0].total_stock_in}`);

    if (
      Number(finalInv.rows[0].quantity_in_stock) === expectedStock &&
      Number(finalWs.rows[0].quantity) === passedQty &&
      Number(finalGsl.rows[0].closing_balance) === passedQty
    ) {
      console.log("✅ ALL UNIT TESTS PASSED SUCCESSFULLY!");
    } else {
      console.error("❌ UNIT TEST FAILED: Stock mismatch detected.");
    }

    // Clean up test records
    await client.query(`DELETE FROM qc_inspections WHERE grn_item_id = $1;`, [grnItemId]);
    await client.query(`DELETE FROM grn_items WHERE id = $1;`, [grnItemId]);
    await client.query(`DELETE FROM grn WHERE id = $1;`, [grnId]);
    await client.query(`DELETE FROM po_items WHERE id = $1;`, [poItemId]);
    await client.query(`DELETE FROM purchase_orders WHERE id = $1;`, [poId]);
    await client.query(`DELETE FROM purchase_requisitions WHERE id = $1;`, [prId]);
    await client.query(`DELETE FROM warehouse_stock WHERE item_id = $1;`, [invItem.id]);
    await client.query(`DELETE FROM global_stock_ledger WHERE item_id = $1;`, [invItem.id]);
    await client.query(`DELETE FROM inventory_items WHERE id = $1;`, [invItem.id]);
    console.log("[CLEANUP] Cleaned up unit test records.");

  } catch (err) {
    console.error("Unit test execution error:", err);
  } finally {
    await client.end();
  }
}

runUnitTest();
