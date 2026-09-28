import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function check() {
  const url = process.env.DATABASE_URL;
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables in DB:');
    res.rows.forEach(r => console.log(r.table_name));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

check();
