import { sql } from 'drizzle-orm';
import { db } from '../src/shared/db/index.js';

async function run() {
  console.log("Fixing roles and companies...");
  try {
    // 2. Get ABC company
    const abc = await db.execute(sql`SELECT id FROM companies WHERE name ILIKE '%abc%' LIMIT 1`);
    if (abc.rowCount === 0) {
      console.log("ABC Company not found!");
      process.exit(1);
    }
    const abcId = abc.rows[0].id;
    console.log("ABC Company ID:", abcId);

    // 1. Move users from Shanta Life to ABC, then delete Shanta Life
    const shanta = await db.execute(sql`SELECT id FROM companies WHERE name ILIKE '%shanta%'`);
    for (const s of shanta.rows) {
      console.log("Moving users and deleting company:", s.id);
      await db.execute(sql`UPDATE users SET company_id = ${abcId} WHERE company_id = ${s.id}`);
      
      const tablesWithCompanyId = [
        'bpmn_instances', 'bpmn_definitions', 'company_plugins', 'user_panel_settings', 'user_panel_permissions',
        'units', 'departments', 'designations', 'cost_centers', 'vendors', 'purchase_requisitions',
        'document_approvals', 'rfq', 'inventory_items', 'stock_movements', 'role_permissions', 'roles'
      ];

      for (const t of tablesWithCompanyId) {
        try {
          await db.execute(sql.raw(`DELETE FROM ${t} WHERE company_id = '${s.id}'`));
        } catch(e) { /* ignore if table doesn't exist or column missing */ }
      }

      await db.execute(sql`DELETE FROM companies WHERE id = ${s.id}`);
    }


    // 3. Re-create basic roles for ABC Company
    console.log("Recreating roles for ABC Company...");
    const rolesToCreate = ['Super Admin', 'Requester'];
    
    for (const r of rolesToCreate) {
      const existing = await db.execute(sql`SELECT id FROM roles WHERE name = ${r} AND company_id = ${abcId}`);
      if (existing.rowCount === 0) {
        await db.execute(sql`INSERT INTO roles (name, description, company_id) VALUES (${r}, 'System default role', ${abcId})`);
      }
    }

    // 4. Give Super Admin all permissions for ABC company
    const modules = ['Procurement', 'Inventory Management', 'Administration', 'User Panel'];
    for (const mod of modules) {
      await db.execute(sql`
        INSERT INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete, can_approve, company_id)
        VALUES ('Super Admin', ${mod}, true, true, true, true, true, ${abcId})
        ON CONFLICT DO NOTHING
      `);
    }

    console.log("✅ Fix applied successfully.");
  } catch (error) {
    console.error("❌ Failed to fix:", error);
  }
  process.exit(0);
}

run();
