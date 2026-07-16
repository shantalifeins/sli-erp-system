require('dotenv').config({ path: 'd:/Procurement And inventory/.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'warehouses'");
    console.log("WAREHOUSES SCHEMA:", res.rows);
    
    const res2 = await pool.query("SELECT id, name FROM companies WHERE name ILIKE '%abc%' LIMIT 1");
    console.log("ABC COMPANY:", res2.rows);

    if (res2.rows.length > 0) {
      const res3 = await pool.query("SELECT id, name FROM branches WHERE company_id = $1", [res2.rows[0].id]);
      console.log("BRANCHES:", res3.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
