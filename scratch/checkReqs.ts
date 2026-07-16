import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '../src/shared/db/index.js';
import { users, purchase_requisitions, companies } from '../src/shared/db/schema.js';
import { eq, ilike } from 'drizzle-orm';

async function run() {
  const c = await db.select().from(companies).where(ilike(companies.name, '%abc%'));
  if (!c[0]) return;
  const companyId = c[0].id;
  
  const allUsers = await db.select().from(users).where(eq(users.companyId, companyId));
  console.log('Total ABC Users:', allUsers.length);
  
  const reqs = await db.select().from(purchase_requisitions).where(eq(purchase_requisitions.companyId, companyId));
  
  const uidCounts: Record<string, number> = {};
  for (const r of reqs) {
    uidCounts[r.uid] = (uidCounts[r.uid] || 0) + 1;
  }
  
  for (const [uid, count] of Object.entries(uidCounts)) {
    const user = allUsers.find(u => u.uid === uid);
    if (user) {
      console.log(`User ${user.email} (Role: ${user.role}) has ${count} requisitions.`);
    } else {
      console.log(`UID ${uid} has ${count} requisitions but is NOT in ABC users table.`);
    }
  }
}
run().then(() => process.exit(0));
