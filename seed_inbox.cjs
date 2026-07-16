require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    const abcCompanyId = 'a59e2cb5-d642-4edf-8c6a-b9d95ff765d0';
    
    // Fetch existing pending stock out requests
    const { rows: pendingRequests } = await pool.query(
      `SELECT sor.id, sor.request_number, sor.quantity, sor.reason, ii.name as item_name
       FROM stock_out_requests sor
       JOIN inventory_items ii ON sor.item_id = ii.id
       WHERE sor.company_id = $1 AND sor.status = 'Pending'
       LIMIT 6`, [abcCompanyId]
    );

    console.log(`Found ${pendingRequests.length} pending stock out requests.`);

    if (pendingRequests.length === 0) {
      console.log('No pending requests found. Nothing to seed.');
      pool.end();
      return;
    }

    console.log('Inserting Inbox Tasks for pending Stock Out requests...');
    for (const req of pendingRequests) {
      await pool.query(`
        INSERT INTO inbox_tasks (company_id, assigned_to_role, category, title, message, action_link, reference_type, reference_id, status)
        VALUES ($1, 'Super Admin', 'Inventory', $2, $3, '/stock-out', 'StockOut', $4, 'Pending')
      `, [
        abcCompanyId,
        `Stock Out Approval: ${req.request_number}`,
        `${req.item_name} - Qty: ${req.quantity}. Reason: ${req.reason}`,
        req.id
      ]);
      console.log(`  → Created inbox task for ${req.request_number}`);
    }

    // Add a Procurement task for variety
    await pool.query(`
      INSERT INTO inbox_tasks (company_id, assigned_to_role, category, title, message, action_link, reference_type, reference_id, status)
      VALUES ($1, 'Super Admin', 'Procurement', 'Approve PR-2023-991', 'Purchase of new IT equipment for Q3 - 15 Laptops, 5 Monitors', '/pr', 'PR', 991, 'Pending')
    `, [abcCompanyId]);
    console.log('  → Created Procurement inbox task');

    console.log('\nInbox Seed completed successfully!');
  } catch (err) {
    console.error('Seed Error:', err);
  } finally {
    pool.end();
  }
})();
