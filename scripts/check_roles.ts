import { sql } from 'drizzle-orm';
import { db } from '../src/shared/db/index.js';

async function run() {
  try {
    const allRoles = await db.execute(sql`SELECT r.id, r.name, r.company_id, c.name as company_name FROM roles r LEFT JOIN companies c ON r.company_id = c.id;`);
    console.log("ALL ROLES IN DB:");
    console.table(allRoles.rows);
  } catch (error) {
    console.error("Query failed:", error);
  }
  process.exit(0);
}

run();
