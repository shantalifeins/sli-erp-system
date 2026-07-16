require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    // ABC Company UUID
    const abcCompanyId = 'a59e2cb5-d642-4edf-8c6a-b9d95ff765d0';
    
    // Fetch super admin UID for foreign keys
    const { rows: uRows } = await pool.query(`SELECT uid FROM users WHERE company_id = $1 LIMIT 1`, [abcCompanyId]);
    const adminUid = uRows.length > 0 ? uRows[0].uid : 'admin_abc_placeholder';

    // 1. item_categories
    const { rows: catRows } = await pool.query(`
      INSERT INTO item_categories (company_id, name, description, status)
      VALUES ($1, 'IT Equipment', 'Laptops, Monitors, etc', 'Active')
      RETURNING id;
    `, [abcCompanyId]);
    const catId = catRows[0].id;

    // 2. inventory_items (5 items)
    const { rows: invRows } = await pool.query(`
      INSERT INTO inventory_items (company_id, item_code, name, category, quantity_in_stock, uom, reorder_level)
      VALUES 
      ($1, 'IT-001', 'Dell Latitude 3420', 'IT Equipment', 10, 'PCs', 2),
      ($1, 'IT-002', 'Lenovo Thinkpad E14', 'IT Equipment', 15, 'PCs', 3),
      ($1, 'IT-003', 'Logitech Wireless Mouse', 'IT Equipment', 50, 'PCs', 10),
      ($1, 'IT-004', 'HP 24f Monitor', 'IT Equipment', 20, 'PCs', 5),
      ($1, 'IT-005', 'Mechanical Keyboard', 'IT Equipment', 30, 'PCs', 5)
      RETURNING id;
    `, [abcCompanyId]);

    // 3. vendors
    const { rows: vendorRows } = await pool.query(`
      INSERT INTO vendors (company_id, name, email, phone, status)
      VALUES ($1, 'ABC IT Suppliers', 'contact@abcsup.com', '0123456789', 'Active')
      RETURNING id;
    `, [abcCompanyId]);
    const vendorId = vendorRows[0].id;

    // 4. purchase_requisitions
    const { rows: prRows } = await pool.query(`
      INSERT INTO purchase_requisitions (company_id, pr_number, requestor, uid, department, estimated_cost, status)
      VALUES ($1, 'PR-ABC-1001', 'Admin', $2, 'IT', 50000, 'Approved')
      RETURNING id;
    `, [abcCompanyId, adminUid]);
    const prId = prRows[0].id;

    // 5. pr_items
    const { rows: prItemRows } = await pool.query(`
      INSERT INTO pr_items (pr_id, item_id, item_name, quantity, uom, estimated_price)
      VALUES ($1, $2, 'Dell Latitude 3420', 5, 'PCs', 50000)
      RETURNING id;
    `, [prId, invRows[0].id]);
    const prItemId = prItemRows[0].id;

    // 6. rfq
    const { rows: rfqRows } = await pool.query(`
      INSERT INTO rfq (company_id, rfq_number, pr_id, status)
      VALUES ($1, 'RFQ-ABC-1001', $2, 'Closed')
      RETURNING id;
    `, [abcCompanyId, prId]);
    const rfqId = rfqRows[0].id;

    // 7. rfq_vendors
    await pool.query(`
      INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2)
    `, [rfqId, vendorId]);

    // 8. quotations
    await pool.query(`
      INSERT INTO quotations (rfq_id, vendor_id, pr_item_id, quoted_price)
      VALUES ($1, $2, $3, 49000)
    `, [rfqId, vendorId, prItemId]);

    // 9. comparative_statements
    const { rows: csRows } = await pool.query(`
      INSERT INTO comparative_statements (company_id, cs_number, rfq_id, pr_id, selected_vendor_id, status)
      VALUES ($1, 'CS-ABC-1001', $2, $3, $4, 'Approved')
      RETURNING id;
    `, [abcCompanyId, rfqId, prId, vendorId]);

    // 10. purchase_orders
    const { rows: poRows } = await pool.query(`
      INSERT INTO purchase_orders (company_id, po_number, pr_id, cs_id, vendor_id, total_amount, status)
      VALUES ($1, 'PO-ABC-1001', $2, $3, $4, 245000, 'Approved')
      RETURNING id;
    `, [abcCompanyId, prId, csRows[0].id, vendorId]);
    const poId = poRows[0].id;

    // 11. po_items
    const { rows: poItemRows } = await pool.query(`
      INSERT INTO po_items (po_id, item_name, quantity, uom, unit_price)
      VALUES ($1, 'Dell Latitude 3420', 5, 'PCs', 49000)
      RETURNING id;
    `, [poId]);

    // 12. grn
    const { rows: grnRows } = await pool.query(`
      INSERT INTO grn (company_id, grn_number, po_id, received_by, status)
      VALUES ($1, 'GRN-ABC-1001', $2, $3, 'QC Completed')
      RETURNING id;
    `, [abcCompanyId, poId, adminUid]);
    const grnId = grnRows[0].id;

    // 13. grn_items
    const { rows: grnItemRows } = await pool.query(`
      INSERT INTO grn_items (grn_id, po_item_id, quantity_received, status)
      VALUES ($1, $2, 5, 'Passed')
      RETURNING id;
    `, [grnId, poItemRows[0].id]);
    const grnItemId = grnItemRows[0].id;

    // 14. qc_inspections
    await pool.query(`
      INSERT INTO qc_inspections (grn_item_id, inspected_qty, passed_qty, failed_qty, inspected_by)
      VALUES ($1, 5, 5, 0, $2)
    `, [grnItemId, adminUid]);

    // 15. invoices
    const { rows: inv2Rows } = await pool.query(`
      INSERT INTO invoices (invoice_number, po_id, grn_id, amount, status)
      VALUES ('INV-ABC-1001', $1, $2, 245000, 'Approved')
      RETURNING id;
    `, [poId, grnId]);
    const invoiceId = inv2Rows[0].id;

    // 16. payments
    await pool.query(`
      INSERT INTO payments (payment_number, invoice_id, payment_method, amount_paid, status)
      VALUES ('PAY-ABC-1001', $1, 'Bank Transfer', 245000, 'Completed')
    `, [invoiceId]);

    console.log('✅ Inserted data successfully for ABC Company across all tables.');
  } catch (err) {
    console.error('Error inserting data:', err);
  } finally {
    pool.end();
  }
})();
