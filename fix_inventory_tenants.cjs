require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  try {
    // Get the first company (or all companies)
    const companies = await pool.query('SELECT id, name FROM companies ORDER BY created_at ASC');
    console.log('Companies found:', companies.rows);

    if (companies.rows.length === 0) {
      console.log('No companies found!');
      return;
    }

    const firstCompany = companies.rows[0];
    console.log('Assigning existing items to first company:', firstCompany.name, firstCompany.id);

    // Update inventory_items with NULL company_id
    const invResult = await pool.query(
      `UPDATE inventory_items SET company_id = $1 WHERE company_id IS NULL`,
      [firstCompany.id]
    );
    console.log(`Updated ${invResult.rowCount} inventory_items`);

    // Update item_categories with NULL company_id
    const catResult = await pool.query(
      `UPDATE item_categories SET company_id = $1 WHERE company_id IS NULL`,
      [firstCompany.id]
    );
    console.log(`Updated ${catResult.rowCount} item_categories`);

    // Show counts
    const invCount = await pool.query('SELECT company_id, COUNT(*) FROM inventory_items GROUP BY company_id');
    console.log('inventory_items by company:', invCount.rows);

    const catCount = await pool.query('SELECT company_id, COUNT(*) FROM item_categories GROUP BY company_id');
    console.log('item_categories by company:', catCount.rows);

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    pool.end();
  }
}

migrate();
