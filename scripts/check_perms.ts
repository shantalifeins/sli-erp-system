import { sql } from 'drizzle-orm';
import { db } from '../src/shared/db/index.js';

async function run() {
  try {
    const allPerms = await db.execute(sql`SELECT * FROM role_permissions`);
    console.log("ALL PERMS IN DB:");
    console.log(allPerms.rows);
  } catch (error) {
    console.error("Query failed:", error);
  }
  process.exit(0);
}

run();
