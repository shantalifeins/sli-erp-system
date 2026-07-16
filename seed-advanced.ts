import 'dotenv/config';
import { db } from './src/shared/db';
import * as schema from './src/shared/db/schema';
import { eq } from 'drizzle-orm';

async function seedAdvancedData() {
  console.log('Seeding Advanced Data (PO, GRN, Invoices, Payments)...');

  // Get necessary foreign keys
  const allUsers = await db.select().from(schema.users).limit(1);
  const uid = allUsers.length > 0 ? allUsers[0].uid : 'seed-uid-1234';

  const allPRs = await db.select().from(schema.purchase_requisitions).limit(5);
  if (allPRs.length === 0) {
    console.error('No PRs found. Run seed-data.ts first!');
    process.exit(1);
  }

  const allVendors = await db.select().from(schema.vendors).limit(1);
  if (allVendors.length === 0) {
    console.error('No Vendors found. Run seed-data.ts first!');
    process.exit(1);
  }
  const vendorId = allVendors[0].id;

  // 1. Purchase Orders
  const posData = [
    { poNumber: 'PO-2023-1001', prId: allPRs[0].id, vendorId, totalAmount: '15000.00', status: 'Delivered' },
    { poNumber: 'PO-2023-1002', prId: allPRs[0].id, vendorId, totalAmount: '22000.00', status: 'Delivered' },
    { poNumber: 'PO-2023-1003', prId: allPRs[1]?.id || allPRs[0].id, vendorId, totalAmount: '5500.00', status: 'Approved' },
    { poNumber: 'PO-2023-1004', prId: allPRs[2]?.id || allPRs[0].id, vendorId, totalAmount: '98000.00', status: 'Pending Approval' },
    { poNumber: 'PO-2023-1005', prId: allPRs[3]?.id || allPRs[0].id, vendorId, totalAmount: '3400.00', status: 'Closed' },
  ];

  for (let i = 0; i < posData.length; i++) {
    const po = posData[i];
    const poRes = await db.insert(schema.purchase_orders).values(po).onConflictDoNothing().returning({ id: schema.purchase_orders.id });
    
    if (poRes.length > 0) {
      const poId = poRes[0].id;
      
      // Insert PO Item
      const poItemRes = await db.insert(schema.po_items).values({
        poId,
        itemName: 'Bulk Supply A',
        quantity: 10,
        uom: 'Boxes',
        unitPrice: '1500'
      }).returning({ id: schema.po_items.id });

      // Create GRN
      const grnRes = await db.insert(schema.grn).values({
        grnNumber: `GRN-2023-${1000 + i}`,
        poId,
        receivedBy: uid,
        status: 'QC Completed'
      }).onConflictDoNothing().returning({ id: schema.grn.id });

      if (grnRes.length > 0 && poItemRes.length > 0) {
        const grnId = grnRes[0].id;

        // Insert GRN Item
        await db.insert(schema.grn_items).values({
          grnId,
          poItemId: poItemRes[0].id,
          quantityReceived: 10,
          status: 'Passed'
        }).onConflictDoNothing();

        // Create Invoice
        const invRes = await db.insert(schema.invoices).values({
          invoiceNumber: `INV-2023-${5000 + i}`,
          poId,
          grnId,
          amount: po.totalAmount,
          status: i % 2 === 0 ? 'Approved' : 'Paid',
          matchingNotes: '3-way matched automatically'
        }).onConflictDoNothing().returning({ id: schema.invoices.id });

        // Create Payment for some invoices
        if (invRes.length > 0) {
          const invoiceId = invRes[0].id;
          await db.insert(schema.payments).values({
            paymentNumber: `PAY-2023-${9000 + i}`,
            invoiceId,
            paymentMethod: 'Bank Transfer',
            amountPaid: po.totalAmount,
            status: 'Completed',
            referenceNumber: `TXN-${Date.now()}-${i}`
          }).onConflictDoNothing();
        }
      }
    }
  }
  
  console.log('✅ Advanced Data Seeded Successfully!');
  process.exit(0);
}

seedAdvancedData().catch(console.error);
