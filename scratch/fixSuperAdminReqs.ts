import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '../src/shared/db/index.js';
import { users, purchase_requisitions, companies } from '../src/shared/db/schema.js';
import { eq, ilike } from 'drizzle-orm';

async function run() {
  const c = await db.select().from(companies).where(ilike(companies.name, '%abc%'));
  if (!c[0]) return;
  const companyId = c[0].id;
  
  // Find the global Super Admin user (probably shantalifeins)
  const allUsers = await db.select().from(users);
  let superAdmin = allUsers.find(u => u.role === 'Super Admin' && u.email?.includes('shantalifeins'));
  if (!superAdmin) {
      superAdmin = allUsers.find(u => u.role === 'Super Admin'); // fallback
  }

  if (!superAdmin) {
      console.log("Could not find any Super Admin user in the system.");
      process.exit(0);
  }

  console.log("Found Super Admin:", superAdmin.email, "with UID:", superAdmin.uid);

  // Take the 7 requisitions currently assigned to amirul.nadim1@shantalife.com and assign them to the true Super Admin
  const targetEmail = 'amirul.nadim1@shantalife.com';
  const targetUser = allUsers.find(u => u.email === targetEmail);

  if (targetUser) {
      const reqsToUpdate = await db.select().from(purchase_requisitions)
          .where(eq(purchase_requisitions.uid, targetUser.uid));
          
      for (const req of reqsToUpdate) {
          if (req.companyId === companyId) {
              await db.update(purchase_requisitions)
                  .set({ 
                      uid: superAdmin.uid,
                      requestor: 'SHANTALIFEINS' 
                  })
                  .where(eq(purchase_requisitions.id, req.id));
          }
      }
      console.log(`Updated ${reqsToUpdate.length} requisitions to the true Super Admin's UID.`);
  }
}

run().then(() => process.exit(0));
