// Temporary migration script - creates asset_locations table
// Run: node scripts/create-asset-locations.cjs
// Delete after running.
const { Pool } = require('pg');
require('dotenv').config();

const DEFAULT_DATABASE_URL = "postgresql://postgres.lyoozoeryooisqywbfyg:_m%40qU2757EsbdVD@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || DEFAULT_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS asset_locations (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
        parent_id UUID REFERENCES asset_locations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ asset_locations table created (or already exists).');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error('❌', err); process.exit(1); });
