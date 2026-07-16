require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query(`
  ALTER TABLE inventory_items 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

  ALTER TABLE item_categories
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
`)
.then(() => { 
  console.log('Migration success: company_id added to inventory_items and item_categories'); 
  pool.end(); 
})
.catch(e => { 
  console.error('Migration error:', e.message); 
  pool.end(); 
});
