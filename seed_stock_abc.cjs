require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    const abcCompanyId = 'a59e2cb5-d642-4edf-8c6a-b9d95ff765d0';
    
    // Fetch super admin UID
    const { rows: uRows } = await pool.query(`SELECT uid FROM users WHERE company_id = $1 LIMIT 1`, [abcCompanyId]);
    const adminUid = uRows.length > 0 ? uRows[0].uid : null;

    if (!adminUid) throw new Error('No admin user found for ABC Company.');

    // Get a few items
    const { rows: items } = await pool.query(`SELECT id, quantity_in_stock FROM inventory_items WHERE company_id = $1 LIMIT 5`, [abcCompanyId]);
    if (items.length < 5) throw new Error('Not enough items to seed stock ledger.');

    console.log('Seeding stock out requests...');
    await pool.query(`
      INSERT INTO stock_out_requests (company_id, request_number, item_id, quantity, reason, status, requested_by) VALUES 
      ($1, 'SO-1001', $2, 10, 'Office use', 'Pending', $7),
      ($1, 'SO-1002', $3, 20, 'Maintenance', 'Approved', $7),
      ($1, 'SO-1003', $4, 5, 'Client Demo', 'Rejected', $7),
      ($1, 'SO-1004', $5, 15, 'Replacement', 'Pending', $7),
      ($1, 'SO-1005', $6, 8, 'Event setup', 'Pending', $7)
    `, [abcCompanyId, items[0].id, items[1].id, items[2].id, items[3].id, items[4].id, adminUid]);

    console.log('Seeding global stock ledger...');
    await pool.query(`
      INSERT INTO global_stock_ledger (company_id, item_id, opening_balance, total_stock_in, total_stock_out, closing_balance) VALUES 
      ($1, $2, 0, 100, 10, 90),
      ($1, $3, 0, 50, 0, 50),
      ($1, $4, 0, 200, 20, 180),
      ($1, $5, 0, 80, 5, 75),
      ($1, $6, 0, 150, 0, 150)
    `, [abcCompanyId, items[0].id, items[1].id, items[2].id, items[3].id, items[4].id]);

    console.log('Stock Seed completed for ABC Company.');
  } catch (err) {
    console.error('Seed Error:', err);
  } finally {
    pool.end();
  }
})();
