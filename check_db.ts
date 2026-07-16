import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
async function run() {
  const res = await pool.query('SELECT id, name, document_type, is_active FROM bpmn_definitions');
  console.log(res.rows);
  process.exit(0);
}
run();
