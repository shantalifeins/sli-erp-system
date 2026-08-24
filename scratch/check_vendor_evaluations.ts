import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const tableRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'vendor_evaluations'
    `);
    console.log("vendor_evaluations table exists:", tableRes.rows);

    if (tableRes.rows.length > 0) {
      const cols = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'vendor_evaluations'
      `);
      console.log("Columns:", cols.rows);

      const data = await pool.query('SELECT * FROM vendor_evaluations LIMIT 5');
      console.log("Data count:", data.rows.length);
    }
  } catch (err) {
    console.error("Database query error:", err);
  } finally {
    await pool.end();
  }
}

run();
