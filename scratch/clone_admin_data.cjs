require('dotenv').config();
const { Pool } = require('pg');
const crypto = require('crypto');

const sourceCompanyId = '19b23b55-bc5b-440f-9de0-7d64051b2a86'; // Shanta
const targetCompanyId = 'a59e2cb5-d642-4edf-8c6a-b9d95ff765d0'; // ABC

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    await pool.query('BEGIN');

    // 1. Delete target data
    console.log("Wiping existing target data...");
    await pool.query('DELETE FROM users WHERE company_id = $1', [targetCompanyId]);
    await pool.query('DELETE FROM role_permissions WHERE company_id = $1', [targetCompanyId]);
    await pool.query('DELETE FROM roles WHERE company_id = $1', [targetCompanyId]);
    await pool.query('DELETE FROM departments WHERE company_id = $1', [targetCompanyId]);
    await pool.query('DELETE FROM designations WHERE company_id = $1', [targetCompanyId]);
    await pool.query('DELETE FROM branches WHERE company_id = $1', [targetCompanyId]);
    await pool.query('DELETE FROM warehouses WHERE company_id = $1', [targetCompanyId]);
    await pool.query('DELETE FROM bpmn_definitions WHERE company_id = $1', [targetCompanyId]);
    // Also warehouse_managers
    await pool.query('DELETE FROM warehouse_managers WHERE user_id IN (SELECT uid FROM users WHERE company_id = $1)', [targetCompanyId]);
    
    // 2. Clone Branches
    console.log("Cloning branches...");
    const branches = (await pool.query('SELECT * FROM branches WHERE company_id = $1', [sourceCompanyId])).rows;
    const branchMap = {};
    for (const b of branches) {
      const res = await pool.query(
        'INSERT INTO branches (name, address, company_id) VALUES ($1, $2, $3) RETURNING id',
        [b.name, b.address, targetCompanyId]
      );
      branchMap[b.id] = res.rows[0].id;
    }

    // 3. Clone Departments
    console.log("Cloning departments...");
    const depts = (await pool.query('SELECT * FROM departments WHERE company_id = $1', [sourceCompanyId])).rows;
    const deptMap = {}; // by name usually, but let's map uid if needed. Actually, depts have manager_uid, we must update this AFTER users are created.
    for (const d of depts) {
      const res = await pool.query(
        'INSERT INTO departments (name, code, manager_uid, company_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [d.name, d.code + '-ABC', null, targetCompanyId, d.status]
      );
      deptMap[d.id] = { newId: res.rows[0].id, oldManagerUid: d.manager_uid };
    }

    // 4. Clone Designations
    console.log("Cloning designations...");
    const desigs = (await pool.query('SELECT * FROM designations WHERE company_id = $1', [sourceCompanyId])).rows;
    for (const d of desigs) {
      await pool.query(
        'INSERT INTO designations (name, company_id, status) VALUES ($1, $2, $3)',
        [d.name, targetCompanyId, d.status]
      );
    }

    // 5. Clone Roles & Permissions
    console.log("Cloning roles...");
    const roles = (await pool.query('SELECT * FROM roles WHERE company_id = $1', [sourceCompanyId])).rows;
    const roleMap = {};
    for (const r of roles) {
      const res = await pool.query(
        'INSERT INTO roles (name, description, company_id) VALUES ($1, $2, $3) RETURNING id',
        [r.name, r.description, targetCompanyId]
      );
      roleMap[r.id] = res.rows[0].id;
      
      // clone permissions (using the role name)
      const perms = (await pool.query('SELECT * FROM role_permissions WHERE company_id = $1 AND role = $2', [sourceCompanyId, r.name])).rows;
      for (const p of perms) {
        await pool.query(
          'INSERT INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete, can_approve, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [r.name, p.module, p.can_view, p.can_create, p.can_edit, p.can_delete, p.can_approve, targetCompanyId]
        );
      }
    }

    // 6. Clone Warehouses
    console.log("Cloning warehouses...");
    const warehouses = (await pool.query('SELECT * FROM warehouses WHERE company_id = $1', [sourceCompanyId])).rows;
    const warehouseMap = {};
    for (const w of warehouses) {
      const res = await pool.query(
        'INSERT INTO warehouses (name, location, branch_id, status, company_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [w.name, w.location, branchMap[w.branch_id], w.status, targetCompanyId]
      );
      warehouseMap[w.id] = res.rows[0].id;
    }

    // 7. Clone Users
    console.log("Cloning users...");
    const users = (await pool.query('SELECT * FROM users WHERE company_id = $1', [sourceCompanyId])).rows;
    const userMap = {}; // old_uid -> new_uid
    for (const u of users) {
      userMap[u.uid] = crypto.randomUUID();
    }
    
    for (const u of users) {
      await pool.query(
        `INSERT INTO users (uid, company_id, branch_id, email, name, avatar_url, designation, phone, supervisor_uid, role, department, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          userMap[u.uid],
          targetCompanyId,
          branchMap[u.branch_id] || null,
          u.email,
          u.name,
          u.avatar_url,
          u.designation,
          u.phone,
          userMap[u.supervisor_uid] || null,
          u.role,
          u.department,
          u.status
        ]
      );
    }

    // Update department manager_uids now that users exist
    console.log("Updating department managers...");
    for (const oldId of Object.keys(deptMap)) {
      const { newId, oldManagerUid } = deptMap[oldId];
      if (oldManagerUid && userMap[oldManagerUid]) {
        await pool.query('UPDATE departments SET manager_uid = $1 WHERE id = $2', [userMap[oldManagerUid], newId]);
      }
    }

    // 8. Clone Warehouse Managers
    console.log("Cloning warehouse managers...");
    const wm = (await pool.query('SELECT wm.* FROM warehouse_managers wm JOIN users u ON u.uid = wm.user_id WHERE u.company_id = $1', [sourceCompanyId])).rows;
    for (const m of wm) {
      if (userMap[m.user_id] && warehouseMap[m.warehouse_id]) {
        await pool.query(
          'INSERT INTO warehouse_managers (warehouse_id, user_id, company_id, item_type) VALUES ($1, $2, $3, $4)',
          [warehouseMap[m.warehouse_id], userMap[m.user_id], targetCompanyId, m.item_type || 'Both']
        );
      }
    }

    // 9. Clone BPMN Definitions
    console.log("Cloning workflows...");
    const workflows = (await pool.query('SELECT * FROM bpmn_definitions WHERE company_id = $1', [sourceCompanyId])).rows;
    for (const w of workflows) {
      await pool.query(
        'INSERT INTO bpmn_definitions (name, document_type, department, xml_data, is_active, company_id) VALUES ($1, $2, $3, $4, $5, $6)',
        [w.name, w.document_type, w.department, w.xml_data, w.is_active, targetCompanyId]
      );
    }

    await pool.query('COMMIT');
    console.log("Cloning completed successfully!");
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error("Cloning failed", e);
  } finally {
    pool.end();
  }
}

run();
