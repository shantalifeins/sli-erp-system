import { sql } from 'drizzle-orm';
import { db } from '../src/shared/db/index.js';

async function run() {
  console.log("Starting DB schema update for multi-tenant roles & permissions...");
  
  try {
    // 1. Add company_id to role_permissions if it doesn't exist
    console.log("Adding company_id to role_permissions...");
    await db.execute(sql`
      ALTER TABLE role_permissions 
      ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
    `);

    // We need to set a default company_id for existing rows so we can create constraints safely.
    console.log("Setting default company_id for existing records...");
    const companies = await db.execute(sql`SELECT id FROM companies LIMIT 1;`);
    if (companies.rowCount > 0) {
      const defaultCompanyId = companies.rows[0].id;
      await db.execute(sql`
        UPDATE roles SET company_id = ${defaultCompanyId} WHERE company_id IS NULL;
      `);
      await db.execute(sql`
        UPDATE role_permissions SET company_id = ${defaultCompanyId} WHERE company_id IS NULL;
      `);
    }

    // 2. Drop the global unique constraint on roles.name
    console.log("Dropping global unique constraint on roles.name...");
    try {
      await db.execute(sql`ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_unique;`);
    } catch(e) { console.log("roles_name_unique not found, ignoring."); }

    // 3. Create unique index for roles (company_id, name)
    console.log("Creating unique index on roles...");
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS role_company_unq_idx ON roles(company_id, name);
    `);

    // 4. Create unique index for role_permissions (company_id, role, module)
    // First remove exact duplicates to avoid failure
    console.log("Cleaning duplicates in role_permissions...");
    await db.execute(sql`
      DELETE FROM role_permissions a USING role_permissions b 
      WHERE a.id < b.id 
      AND a.company_id = b.company_id 
      AND a.role = b.role 
      AND a.module = b.module;
    `);

    console.log("Creating unique index on role_permissions...");
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS perm_role_mod_unq_idx ON role_permissions(company_id, role, module);
    `);

    console.log("✅ Multi-tenant roles & permissions DB update complete!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  }
  
  process.exit(0);
}

run();
