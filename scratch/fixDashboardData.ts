import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '../src/shared/db/index.js';
import { companies, purchase_requisitions } from '../src/shared/db/schema.js';
import { eq, ilike, and, inArray } from 'drizzle-orm';

async function run() {
  try {
    const companyRows = await db.select().from(companies).where(ilike(companies.name, '%abc%'));
    if (companyRows.length === 0) return;
    const companyId = companyRows[0].id;

    // Get all requisitions for ABC Company
    const allReqs = await db.select().from(purchase_requisitions).where(eq(purchase_requisitions.companyId, companyId));
    
    // We need to fulfill: Pending, Rejected, Fully Delivered, Partially Delivered
    
    // 1. Set some 'Pending Approval' to 'Pending' so the dashboard catches them
    const pendingApprovalReqs = allReqs.filter(r => r.status === 'Pending Approval');
    for (let i = 0; i < Math.min(5, pendingApprovalReqs.length); i++) {
        await db.update(purchase_requisitions)
          .set({ status: 'Pending' })
          .where(eq(purchase_requisitions.id, pendingApprovalReqs[i].id));
    }

    // 2. Set some to 'Rejected'
    const draftReqs = allReqs.filter(r => r.status === 'Draft');
    for (let i = 0; i < Math.min(3, draftReqs.length); i++) {
        await db.update(purchase_requisitions)
          .set({ status: 'Rejected' })
          .where(eq(purchase_requisitions.id, draftReqs[i].id));
    }

    // 3. Set some Approved to 'Fully Delivered'
    const approvedReqs = allReqs.filter(r => r.status === 'Approved' && r.deliveryStatus === 'Not Delivered');
    for (let i = 0; i < Math.min(5, approvedReqs.length); i++) {
        await db.update(purchase_requisitions)
          .set({ deliveryStatus: 'Fully Delivered' })
          .where(eq(purchase_requisitions.id, approvedReqs[i].id));
    }

    // 4. Set some Approved to 'Partially Delivered'
    const approvedReqs2 = allReqs.filter(r => r.status === 'Approved' && r.deliveryStatus === 'Not Delivered');
    for (let i = 5; i < Math.min(9, approvedReqs2.length); i++) {
        await db.update(purchase_requisitions)
          .set({ deliveryStatus: 'Partially Delivered' })
          .where(eq(purchase_requisitions.id, approvedReqs2[i].id));
    }

    console.log("Dashboard metrics data updated successfully.");
  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

run();
