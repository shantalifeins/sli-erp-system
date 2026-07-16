import { sql } from 'drizzle-orm';
import { db } from '../src/shared/db/index.js';

async function run() {
  console.log("Cleaning up roles for Shanta Life...");
  
  try {
    // Find Shanta Life company
    const companies = await db.execute(sql`SELECT id, name FROM companies WHERE name ILIKE '%shanta life%'`);
    if (companies.rowCount === 0) {
      console.log("Shanta Life company not found.");
      process.exit(0);
    }

    for (const company of companies.rows) {
      console.log(`Found company: ${company.name} (ID: ${company.id})`);
      
      // Delete permissions
      const pRes = await db.execute(sql`DELETE FROM role_permissions WHERE company_id = ${company.id}`);
      console.log(`Deleted ${pRes.rowCount} role permissions.`);
      
      // Delete roles
      const rRes = await db.execute(sql`DELETE FROM roles WHERE company_id = ${company.id}`);
      console.log(`Deleted ${rRes.rowCount} roles.`);
    }

    console.log("✅ Cleanup complete.");
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
  }
  
  process.exit(0);
}

run();
