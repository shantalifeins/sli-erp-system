const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.lyoozoeryooisqywbfyg:_m%40qU2757EsbdVD@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
async function seedStockIn() {
  const companies = await pool.query('SELECT id FROM companies LIMIT 1');
  if (companies.rowCount === 0) return console.log('No company');
  const companyId = companies.rows[0].id;
  
  const users = await pool.query('SELECT uid FROM users WHERE company_id = $1 LIMIT 1', [companyId]);
  const performedBy = users.rowCount > 0 ? users.rows[0].uid : null;

  const warehouses = await pool.query('SELECT id FROM warehouses WHERE company_id = $1 LIMIT 2', [companyId]);
  if (warehouses.rowCount === 0) return console.log('No warehouses');
  const wh1 = warehouses.rows[0].id;
  
  const vendors = await pool.query('SELECT id FROM vendors WHERE company_id = $1 LIMIT 1', [companyId]);
  const v1 = vendors.rowCount > 0 ? vendors.rows[0].id : null;

  const items = await pool.query('SELECT id, quantity_in_stock FROM inventory_items WHERE company_id = $1 LIMIT 5', [companyId]);
  if (items.rowCount === 0) return console.log('No items');

  for (let item of items.rows) {
    const qty = 50; 
    
    await pool.query('INSERT INTO stock_transactions(company_id, item_id, warehouse_id, vendor_id, transaction_type, quantity, reference_id, performed_by) VALUES ($1, $2, $3, $4, \'Stock In\', $5, \'Initial Seed\', $6)', [companyId, item.id, wh1, v1, qty, performedBy]);
    
    const ws = await pool.query('SELECT id, quantity FROM warehouse_stock WHERE company_id = $1 AND warehouse_id = $2 AND item_id = $3', [companyId, wh1, item.id]);
    if (ws.rowCount > 0) {
      await pool.query('UPDATE warehouse_stock SET quantity = quantity + $1 WHERE id = $2', [qty, ws.rows[0].id]);
    } else {
      await pool.query('INSERT INTO warehouse_stock(company_id, warehouse_id, item_id, quantity) VALUES ($1, $2, $3, $4)', [companyId, wh1, item.id, qty]);
    }

    const gl = await pool.query('SELECT id FROM global_stock_ledger WHERE company_id = $1 AND item_id = $2', [companyId, item.id]);
    if (gl.rowCount > 0) {
      await pool.query('UPDATE global_stock_ledger SET total_stock_in = total_stock_in + $1, closing_balance = closing_balance + $1 WHERE id = $2', [qty, gl.rows[0].id]);
    } else {
      await pool.query('INSERT INTO global_stock_ledger(company_id, item_id, total_stock_in, closing_balance) VALUES ($1, $2, $3, $3)', [companyId, item.id, qty]);
    }

    await pool.query('UPDATE inventory_items SET quantity_in_stock = quantity_in_stock + $1 WHERE id = $2', [qty, item.id]);
  }
  
  console.log('Successfully seeded stock in data');
  pool.end();
}
seedStockIn().catch(console.error);
