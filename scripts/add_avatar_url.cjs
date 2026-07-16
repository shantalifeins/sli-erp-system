// One-off migration: add missing avatar_url column to users table
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Adding avatar_url column if it does not exist...');
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;
    `);
    console.log('✅ Done: avatar_url column is now present in users table.');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
