require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    // ABC Company UUID
    const abcCompanyId = 'a59e2cb5-d642-4edf-8c6a-b9d95ff765d0';
    
    // Fetch super admin UID for foreign keys
    const { rows: uRows } = await pool.query(`SELECT uid FROM users WHERE company_id = $1 LIMIT 1`, [abcCompanyId]);
    const adminUid = uRows.length > 0 ? uRows[0].uid : null;

    if (!adminUid) {
      console.error('No admin user found for ABC Company.');
      process.exit(1);
    }

    // 1. Departments
    const { rows: deptRows } = await pool.query(`
      INSERT INTO departments (company_id, code, name, manager_uid, status)
      VALUES 
      ($1, 'D-IT', 'Information Technology', $2, 'Active'),
      ($1, 'D-HR', 'Human Resources', $2, 'Active'),
      ($1, 'D-FIN', 'Finance', $2, 'Active')
      ON CONFLICT (code) DO NOTHING
      RETURNING id;
    `, [abcCompanyId, adminUid]);

    let itDeptId = deptRows.length > 0 ? deptRows[0].id : null;
    if (!itDeptId) {
      const existing = await pool.query(`SELECT id FROM departments WHERE code = 'D-IT' AND company_id = $1`, [abcCompanyId]);
      if (existing.rows.length) itDeptId = existing.rows[0].id;
    }

    // 2. Units
    if (itDeptId) {
      await pool.query(`
        INSERT INTO units (company_id, department_id, code, name, manager_uid, status)
        VALUES ($1, $2, 'U-IT-DEV', 'Development Team', $3, 'Active')
        ON CONFLICT (code) DO NOTHING
      `, [abcCompanyId, itDeptId, adminUid]);
    }

    // 3. Designations
    await pool.query(`
      INSERT INTO designations (company_id, name, status)
      VALUES 
      ($1, 'Software Engineer', 'Active'),
      ($1, 'IT Manager', 'Active'),
      ($1, 'HR Executive', 'Active')
      ON CONFLICT (name) DO NOTHING
    `, [abcCompanyId]);

    // 4. Cost Centers
    await pool.query(`
      INSERT INTO cost_centers (company_id, code, name)
      VALUES 
      ($1, 'CC-100', 'HQ Operations'),
      ($1, 'CC-200', 'IT Infrastructure')
      ON CONFLICT (code) DO NOTHING
    `, [abcCompanyId]);

    console.log('✅ Inserted administration data successfully for ABC Company.');
  } catch (err) {
    console.error('Error inserting admin data:', err);
  } finally {
    pool.end();
  }
})();
