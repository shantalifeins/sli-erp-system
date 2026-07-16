// create_abc_user.cjs
// Run with: node create_abc_user.cjs
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    // Fetch ABC company id (slug assumed 'abc-company')
    const { rows: compRows } = await pool.query(`SELECT id FROM companies WHERE slug = $1`, ['abc-companyt']);
    if (compRows.length === 0) {
      console.error('ABC company not found.');
      process.exit(1);
    }
    const abcCompanyId = compRows[0].id;

    // Create Supabase Auth user
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin_abc@company.com',
      password: 'SecretPass123!',
      email_confirm: true
    });
    if (authErr) {
      console.error('Supabase error:', authErr);
      process.exit(1);
    }
    const uid = authData.user.id;

    // Insert or update user in local DB
    await pool.query(
      `INSERT INTO users (uid, company_id, email, name, role, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (uid) DO UPDATE SET company_id = EXCLUDED.company_id, role = EXCLUDED.role, status = EXCLUDED.status`,
      [uid, abcCompanyId, authData.user.email, 'ABC Super Admin', 'Super Admin', 'Active']
    );

    console.log('✅ ABC Super Admin created / updated:', authData.user.email);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
})();
