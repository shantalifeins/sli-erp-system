require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Tables to KEEP (workflow related) – everything else will be truncated
const keepTables = [
  'companies',
  'plugins',
  'company_plugins',
  'users', // keep super admin user
  'bpmn_definitions',
  'bpmn_instances',
  'approval_workflows',
  'pr_approvals',
  'document_approvals'
];

async function clean() {
  try {
    // Fetch all tables in public schema
    const result = await pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public';
    `);
    const allTables = result.rows.map(r => r.tablename);
    const toTruncate = allTables.filter(t => !keepTables.includes(t));
    if (toTruncate.length === 0) {
      console.log('Nothing to clean.');
      return;
    }
    console.log('Truncating tables:', toTruncate.join(', '));
    // Build TRUNCATE ... CASCADE statement
    const truncateSQL = `TRUNCATE ${toTruncate.map(t => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE;`;
    await pool.query(truncateSQL);
    console.log('Database cleaned, workflow tables preserved.');
  } catch (e) {
    console.error('Error cleaning DB:', e);
  } finally {
    await pool.end();
  }
}

clean();
