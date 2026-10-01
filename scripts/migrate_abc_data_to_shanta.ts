import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function migrate() {
  const url = process.env.DATABASE_URL;
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  const abcId = 'a59e2cb5-d642-4edf-8c6a-b9d95ff765d0';
  const shantaId = '19b23b55-bc5b-440f-9de0-7d64051b2a86';

  const tablesToMigrate = [
    'item_categories',
    'asset_categories',
    'inventory_items',
    'warehouse_stock',
    'global_stock_ledger',
    'stock_transactions',
    'stock_transfers',
    'stock_out_requests',
    'vendors',
    'vendor_evaluations',
    'purchase_requisitions',
    'rfq',
    'comparative_statements',
    'purchase_orders',
    'work_orders',
    'grn',
    'payments',
    'invoices',
    'assets',
    'asset_depreciation_schedule',
    'accounting_events',
    'document_approvals',
    'inbox_tasks'
  ];

  try {
    await client.connect();
    console.log("🚀 Starting data migration from ABC Company to Shanta Life Insurance PLC...");

    await client.query('BEGIN');

    for (const table of tablesToMigrate) {
      const res = await client.query(
        `UPDATE ${table} SET company_id = $1 WHERE company_id = $2 RETURNING id`,
        [shantaId, abcId]
      );
      console.log(`✅ Table '${table}': Updated ${res.rowCount} rows to Shanta Life Insurance PLC.`);
    }

    await client.query('COMMIT');
    console.log("\n🎉 Migration completed successfully!");

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration error:', error);
  } finally {
    await client.end();
  }
}

migrate();
