import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '../src/shared/db/index.js';
import { users, purchase_requisitions, companies } from '../src/shared/db/schema.js';
import { eq, ilike, and } from 'drizzle-orm';

async function run() {
  try {
    const c = await db.select().from(companies).where(ilike(companies.name, '%abc%'));
    if (!c[0]) return;
    const companyId = c[0].id;

    // Get all users in ABC company
    const abcUsers = await db.select().from(users).where(eq(users.companyId, companyId));
    if (abcUsers.length === 0) return;

    // Get the super admin
    const superAdmins = abcUsers.filter(u => u.role === 'Super Admin');
    const superAdminUid = superAdmins.length > 0 ? superAdmins[0].uid : abcUsers[0].uid;

    // Get normal users (exclude super admin)
    const normalUsers = abcUsers.filter(u => u.uid !== superAdminUid);
    if (normalUsers.length === 0) return; // fallback if no other users exist

    // Get all requisitions
    const reqs = await db.select().from(purchase_requisitions).where(eq(purchase_requisitions.companyId, companyId));

    // We will assign the first 7 to the super admin, and randomly distribute the rest to normal users
    for (let i = 0; i < reqs.length; i++) {
        let assignedUser;
        if (i < 7) {
            assignedUser = superAdmins[0] || abcUsers[0];
        } else {
            // Pick a random normal user
            const randomUser = normalUsers[Math.floor(Math.random() * normalUsers.length)];
            assignedUser = randomUser;
        }

        // We also need to update the requestor name to match the assigned user's name
        const requestorName = assignedUser.name || assignedUser.email.split('@')[0];

        await db.update(purchase_requisitions)
            .set({ 
                uid: assignedUser.uid,
                requestor: requestorName
            })
            .where(eq(purchase_requisitions.id, reqs[i].id));
    }

    console.log("Requisitions successfully redistributed among various users.");
  } catch (err) {
      console.error(err);
  }
  process.exit(0);
}

run();
