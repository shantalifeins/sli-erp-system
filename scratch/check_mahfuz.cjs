const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function check() {
  const client = await pool.connect();
  try {
    const res = await client.query(`SELECT id, uid, email, company_id FROM users WHERE email = 'mahfuz@shantalife.com'`);
    console.log(res.rows);
  } finally {
    client.release();
    pool.end();
  }
}
check();
