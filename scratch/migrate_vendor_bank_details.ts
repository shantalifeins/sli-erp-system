import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log("Connected to DB, running ALTER TABLE vendors...");

    const sql = `
      ALTER TABLE vendors 
      ADD COLUMN IF NOT EXISTS bank_name text,
      ADD COLUMN IF NOT EXISTS branch_name text,
      ADD COLUMN IF NOT EXISTS account_name text,
      ADD COLUMN IF NOT EXISTS account_number text,
      ADD COLUMN IF NOT EXISTS routing_number text;
    `;

    await client.query(sql);
    console.log("Successfully added bank details columns to vendors table!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await client.end();
  }
}

migrate();
