import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '../src/shared/db/index.js';
import { purchase_requisitions, users, companies } from '../src/shared/db/schema.js';
import { eq, ilike, and } from 'drizzle-orm';

async function run() {
  const c = await db.select().from(companies).where(ilike(companies.name, '%abc%'));
  if (!c[0]) return;
  const companyId = c[0].id;
  
  // Find the global Super Admin user
  const allUsers = await db.select().from(users);
  let superAdmin = allUsers.find(u => u.role === 'Super Admin' && u.email?.includes('shantalifeins'));
  if (!superAdmin) superAdmin = allUsers.find(u => u.role === 'Super Admin');

  if (!superAdmin) return;

  // Get the 7 requisitions assigned to the Super Admin
  const reqs = await db.select().from(purchase_requisitions)
      .where(and(
          eq(purchase_requisitions.companyId, companyId),
          eq(purchase_requisitions.uid, superAdmin.uid)
      ));

  if (reqs.length === 7) {
      // Re-distribute statuses specifically for these 7 to populate all cards
      
      // 1 Pending
      await db.update(purchase_requisitions).set({ status: 'Pending', deliveryStatus: 'Not Delivered' }).where(eq(purchase_requisitions.id, reqs[0].id));
      
      // 2 Approved
      await db.update(purchase_requisitions).set({ status: 'Approved', deliveryStatus: 'Not Delivered' }).where(eq(purchase_requisitions.id, reqs[1].id));
      await db.update(purchase_requisitions).set({ status: 'Approved', deliveryStatus: 'Not Delivered' }).where(eq(purchase_requisitions.id, reqs[2].id));
      
      // 1 Rejected
      await db.update(purchase_requisitions).set({ status: 'Rejected', deliveryStatus: 'Not Delivered' }).where(eq(purchase_requisitions.id, reqs[3].id));
      
      // 2 Fully Delivered
      await db.update(purchase_requisitions).set({ status: 'Approved', deliveryStatus: 'Fully Delivered' }).where(eq(purchase_requisitions.id, reqs[4].id));
      await db.update(purchase_requisitions).set({ status: 'Approved', deliveryStatus: 'Fully Delivered' }).where(eq(purchase_requisitions.id, reqs[5].id));
      
      // 1 Partially Delivered
      await db.update(purchase_requisitions).set({ status: 'Approved', deliveryStatus: 'Partially Delivered' }).where(eq(purchase_requisitions.id, reqs[6].id));
      
      console.log("Successfully adjusted the 7 requisitions statuses to populate all cards on the dashboard.");
  } else {
      console.log(`Expected 7 requisitions for super admin, found ${reqs.length}`);
  }
}

run().then(() => process.exit(0));
