import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '../src/shared/db/index.js';
import { plugins, companies, company_plugins, users } from '../src/shared/db/schema.js';

async function seed() {
  console.log("Seeding initial plugins and assigning to default company...");

  try {
    // 1. Create Plugins
    const procPlugin = await db.insert(plugins).values({
      slug: 'procurement',
      name: 'Procurement',
      description: 'Manage item requisitions, orders, and vendors.',
      isCore: false
    }).onConflictDoUpdate({ target: plugins.slug, set: { name: 'Procurement' } }).returning();

    const invPlugin = await db.insert(plugins).values({
      slug: 'inventory',
      name: 'Inventory',
      description: 'Track stock, items, and warehouse management.',
      isCore: false
    }).onConflictDoUpdate({ target: plugins.slug, set: { name: 'Inventory' } }).returning();

    const procId = procPlugin[0].id;
    const invId = invPlugin[0].id;

    // 2. Create Default Company
    const defaultCompany = await db.insert(companies).values({
      name: 'Shanta Life Insurance',
      slug: 'shanta-life'
    }).onConflictDoUpdate({ target: companies.slug, set: { name: 'Shanta Life Insurance' } }).returning();

    const companyId = defaultCompany[0].id;

    // 3. Assign Plugins to Default Company
    await db.insert(company_plugins).values({
      companyId: companyId,
      pluginId: procId,
      status: 'active',
      settings: { max_pr_amount: 500000, require_qc: true }
    }).onConflictDoUpdate({ target: [company_plugins.companyId, company_plugins.pluginId], set: { status: 'active' } });

    await db.insert(company_plugins).values({
      companyId: companyId,
      pluginId: invId,
      status: 'active',
      settings: {}
    }).onConflictDoUpdate({ target: [company_plugins.companyId, company_plugins.pluginId], set: { status: 'active' } });

    console.log("Successfully seeded plugins and assigned them to company:", companyId);
    
    // We also need to let the frontend know this user belongs to this company.
    // For now, since the user table might not have company_id in schema, we will just patch server.ts 
    // temporarily to assign companyId if it's missing in req.user, or we alter the table.

  } catch (error) {
    console.error("Seeding failed:", error);
  }
  process.exit(0);
}

seed();
