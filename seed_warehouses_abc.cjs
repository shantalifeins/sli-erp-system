require('dotenv').config({ path: 'd:/Procurement And inventory/.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const warehouses = [
  { branch_id: 1, name: 'Dhaka Central Warehouse', location: 'Mirpur, Dhaka', status: 'Active' },
  { branch_id: 1, name: 'Tongi Storage', location: 'Tongi Industrial Area', status: 'Active' },
  { branch_id: 2, name: 'Chittagong Port Depot', location: 'Port Road, Chittagong', status: 'Active' },
  { branch_id: 3, name: 'Sylhet Regional Hub', location: 'Zindabazar, Sylhet', status: 'Active' },
  { branch_id: 4, name: 'Uttara Stockroom', location: 'Sector 4, Uttara', status: 'Active' },
];

async function run() {
  try {
    const res = await pool.query("SELECT id FROM companies WHERE name ILIKE '%abc%' LIMIT 1");
    if (res.rows.length === 0) {
      console.error("ABC Company not found");
      return;
    }
    const companyId = res.rows[0].id;
    
    for (const w of warehouses) {
      await pool.query(
        "INSERT INTO warehouses (company_id, branch_id, name, location, status) VALUES ($1, $2, $3, $4, $5)",
        [companyId, w.branch_id, w.name, w.location, w.status]
      );
    }
    console.log("Successfully seeded 5 warehouses for ABC Company.");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
