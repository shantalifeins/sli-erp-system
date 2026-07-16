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
    const { rows: items } = await pool.query(`SELECT id FROM inventory_items WHERE company_id = $1 LIMIT 5`, [abcCompanyId]);
    if (items.length < 5) throw new Error('Not enough items to seed stock in.');

    console.log('Seeding Stock In transactions...');
    await pool.query(`
      INSERT INTO stock_transactions (company_id, item_id, transaction_type, quantity, reference_id, performed_by) VALUES 
      ($1, $2, 'Stock In', 50, 'Initial Stock', $7),
      ($1, $3, 'Stock In', 20, 'Vendor Delivery', $7),
      ($1, $4, 'Stock In', 100, 'Bulk Purchase', $7),
      ($1, $5, 'Stock In', 30, 'Office Supply Restock', $7),
      ($1, $6, 'Stock In', 75, 'New Equipment', $7)
    `, [abcCompanyId, items[0].id, items[1].id, items[2].id, items[3].id, items[4].id, adminUid]);

    console.log('Stock In Seed completed.');
  } catch (err) {
    console.error('Seed Error:', err);
  } finally {
    pool.end();
  }
})();
