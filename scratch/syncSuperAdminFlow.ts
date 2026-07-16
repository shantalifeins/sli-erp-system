import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '../src/shared/db/index.js';
import { purchase_requisitions, comparative_statements, purchase_orders, grn, users, companies, vendors, warehouses, rfq } from '../src/shared/db/schema.js';
import { eq, ilike, and } from 'drizzle-orm';

function generateNumber(prefix: string) {
  return `${prefix}-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
}

async function run() {
  const c = await db.select().from(companies).where(ilike(companies.name, '%abc%'));
  if (!c[0]) return;
  const companyId = c[0].id;
  
  const allUsers = await db.select().from(users);
  let superAdmin = allUsers.find(u => u.role === 'Super Admin' && u.email?.includes('shantalifeins'));
  if (!superAdmin) superAdmin = allUsers.find(u => u.role === 'Super Admin');
  if (!superAdmin) return;

  const allVendors = await db.select().from(vendors).where(eq(vendors.companyId, companyId));
  const allWarehouses = await db.select().from(warehouses).where(eq(warehouses.companyId, companyId));
  if (!allVendors[0] || !allWarehouses[0]) {
      console.log("Missing vendors or warehouses");
      return;
  }

  // Get the 7 requisitions assigned to the Super Admin
  const reqs = await db.select().from(purchase_requisitions)
      .where(and(
          eq(purchase_requisitions.companyId, companyId),
          eq(purchase_requisitions.uid, superAdmin.uid)
      ));

  for (const pr of reqs) {
      if (pr.status === 'Approved') {
          // 1. Create RFQ and CS
          const existingCs = await db.select().from(comparative_statements).where(eq(comparative_statements.prId, pr.id));
          let csId;
          if (existingCs.length === 0) {
              const [newRfq] = await db.insert(rfq).values({
                  companyId,
                  prId: pr.id,
                  rfqNumber: generateNumber('RFQ'),
                  status: 'Closed'
              }).returning({ id: rfq.id });

              const [newCs] = await db.insert(comparative_statements).values({
                  companyId,
                  prId: pr.id,
                  rfqId: newRfq.id,
                  csNumber: generateNumber('CS'),
                  status: 'Approved',
                  justification: 'Automatically generated CS for flow matching'
              }).returning({ id: comparative_statements.id });
              csId = newCs.id;
          } else {
              csId = existingCs[0].id;
              await db.update(comparative_statements).set({ status: 'Approved' }).where(eq(comparative_statements.id, csId));
          }

          // 2. Create PO
          const existingPo = await db.select().from(purchase_orders).where(eq(purchase_orders.csId, csId));
          let poId;
          if (existingPo.length === 0) {
              const [newPo] = await db.insert(purchase_orders).values({
                  companyId,
                  prId: pr.id,
                  csId: csId,
                  vendorId: allVendors[0].id,
                  poNumber: generateNumber('PO'),
                  totalAmount: pr.estimatedCost || '50000',
                  status: 'Approved'
              }).returning({ id: purchase_orders.id });
              poId = newPo.id;
          } else {
              poId = existingPo[0].id;
              await db.update(purchase_orders).set({ status: 'Approved' }).where(eq(purchase_orders.id, poId));
          }

          // 3. Create GRN if Delivered
          if (pr.deliveryStatus === 'Fully Delivered' || pr.deliveryStatus === 'Partially Delivered') {
              const existingGrn = await db.select().from(grn).where(eq(grn.poId, poId));
              if (existingGrn.length === 0) {
                  await db.insert(grn).values({
                      companyId,
                      warehouseId: allWarehouses[0].id,
                      poId: poId,
                      grnNumber: generateNumber('GRN'),
                      receivedBy: superAdmin.uid,
                      status: 'QC Completed'
                  });
              }
          }
      }
  }
  
  console.log("Successfully synchronized flow records (CS, PO, GRN) for the Super Admin's requisitions.");
}

run().then(() => process.exit(0));
