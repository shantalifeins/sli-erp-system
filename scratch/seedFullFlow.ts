import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '../src/shared/db/index.js';
import { 
  companies, users, branches, warehouses, inventory_items, vendors, 
  purchase_requisitions, pr_items, rfq, rfq_vendors, quotations, 
  comparative_statements, vendor_evaluations, purchase_orders, po_items, 
  grn, grn_items, qc_inspections, invoices, payments, 
  stock_transactions, stock_out_requests, stock_transfers, stock_transfer_items,
  global_stock_ledger, warehouse_stock, inbox_tasks
} from '../src/shared/db/schema.js';
import { eq, ilike } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

function generateNumber(prefix: string) {
  return `${prefix}-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
}

async function run() {
  try {
    const companyRows = await db.select().from(companies).where(ilike(companies.name, '%abc%'));
    if (companyRows.length === 0) {
      console.log("ABC company not found.");
      return;
    }
    const companyId = companyRows[0].id;

    // Get basic data
    const abcUsers = await db.select().from(users).where(eq(users.companyId, companyId));
    const items = await db.select().from(inventory_items).where(eq(inventory_items.companyId, companyId));
    const abcVendors = await db.select().from(vendors).where(eq(vendors.companyId, companyId));
    
    if (abcUsers.length === 0 || items.length === 0 || abcVendors.length === 0) {
       console.log("Missing users, items, or vendors for ABC company.");
       return;
    }

    // Ensure we have branches and warehouses
    let branchList = await db.select().from(branches).where(eq(branches.companyId, companyId));
    if (branchList.length === 0) {
      const res = await db.insert(branches).values([{ companyId, name: 'Main Branch' }, { companyId, name: 'Secondary Branch' }]).returning();
      branchList = res;
    }

    let warehouseList = await db.select().from(warehouses).where(eq(warehouses.companyId, companyId));
    if (warehouseList.length === 0) {
      const res = await db.insert(warehouses).values([
        { companyId, branchId: branchList[0].id, name: 'Central Warehouse' },
        { companyId, branchId: branchList[0].id, name: 'IT Warehouse' }
      ]).returning();
      warehouseList = res;
    }

    const requestorUid = abcUsers[0].uid;
    const requestorName = abcUsers[0].name || 'Demo User';
    const dept = abcUsers[0].department || 'IT';

    console.log("--- Generating Item Requisitions (IR) ---");
    // Generate 20 IRs
    const irs = [];
    for(let i=0; i<20; i++) {
       let status = 'Draft';
       if (i >= 5 && i < 10) status = 'Pending Approval';
       if (i >= 10 && i < 15) status = 'Approved';
       if (i >= 15) status = 'Approved'; // will convert these to PR

       let deliveryStatus = 'Not Delivered';
       if (i >= 15) deliveryStatus = 'PR Created';

       const ir = await db.insert(purchase_requisitions).values({
         companyId,
         prNumber: generateNumber('IR'),
         requestor: requestorName,
         uid: requestorUid,
         department: dept,
         estimatedCost: "5000",
         justification: `Demo IR ${i+1}`,
         status,
         deliveryStatus,
       }).returning();
       irs.push(ir[0]);

       // Insert IR items
       await db.insert(pr_items).values([
         { prId: ir[0].id, itemId: items[0].id, itemName: items[0].name, quantity: 10, uom: items[0].uom, estimatedPrice: items[0].basePrice || "100" },
         { prId: ir[0].id, itemId: items[1].id, itemName: items[1].name, quantity: 5, uom: items[1].uom, estimatedPrice: items[1].basePrice || "200" }
       ]);
    }

    console.log("--- Generating Purchase Requisitions (PR) ---");
    // Generate PRs (some from the last 5 IRs)
    const prs = [];
    for(let i=15; i<20; i++) {
       const pr = await db.insert(purchase_requisitions).values({
         companyId,
         prNumber: generateNumber('PR'),
         requestor: requestorName,
         uid: requestorUid,
         department: dept,
         estimatedCost: "15000",
         justification: `PR for IR ${irs[i].prNumber}`,
         status: i === 15 ? 'Draft' : i === 16 ? 'Pending Approval' : 'Approved',
         sourceIrId: irs[i].id
       }).returning();
       prs.push(pr[0]);

       await db.insert(pr_items).values([
         { prId: pr[0].id, itemId: items[0].id, itemName: items[0].name, quantity: 10, uom: items[0].uom, estimatedPrice: items[0].basePrice || "100" }
       ]);
    }
    // Add 5 more direct PRs
    for(let i=0; i<5; i++) {
        const pr = await db.insert(purchase_requisitions).values({
            companyId,
            prNumber: generateNumber('PR'),
            requestor: requestorName,
            uid: requestorUid,
            department: dept,
            estimatedCost: "25000",
            justification: `Direct PR ${i+1}`,
            status: 'Approved'
          }).returning();
          prs.push(pr[0]);
   
          await db.insert(pr_items).values([
            { prId: pr[0].id, itemId: items[2].id, itemName: items[2].name, quantity: 20, uom: items[2].uom, estimatedPrice: items[2].basePrice || "500" }
          ]);
    }

    console.log("--- Generating RFQs & Quotations ---");
    // Create RFQs for 3 Approved PRs
    const rfqs = [];
    for(let i=7; i<10; i++) {
       const r = await db.insert(rfq).values({
         companyId,
         rfqNumber: generateNumber('RFQ'),
         prId: prs[i].id,
         status: 'Closed'
       }).returning();
       rfqs.push(r[0]);

       // Vendors
       await db.insert(rfq_vendors).values([
         { rfqId: r[0].id, vendorId: abcVendors[0].id },
         { rfqId: r[0].id, vendorId: abcVendors[1].id }
       ]);

       // Quotations
       const prItems = await db.select().from(pr_items).where(eq(pr_items.prId, prs[i].id));
       await db.insert(quotations).values([
         { rfqId: r[0].id, vendorId: abcVendors[0].id, prItemId: prItems[0].id, quotedPrice: "480" },
         { rfqId: r[0].id, vendorId: abcVendors[1].id, prItemId: prItems[0].id, quotedPrice: "450" }
       ]);
    }

    console.log("--- Generating CS Evaluations ---");
    const csList = [];
    const csStatuses = ['Draft', 'Pending Approval', 'Approved'];
    for(let i=0; i<3; i++) {
      const cs = await db.insert(comparative_statements).values({
         companyId,
         csNumber: generateNumber('CS'),
         rfqId: rfqs[i].id,
         prId: rfqs[i].prId,
         selectedVendorId: abcVendors[1].id,
         status: csStatuses[i],
         totalAmount: "4500",
         createdBy: requestorUid
      }).returning();
      csList.push(cs[0]);

      await db.insert(vendor_evaluations).values({
         companyId,
         csId: cs[0].id,
         vendorId: abcVendors[1].id,
         criteriaName: 'Price',
         weight: "20.0",
         score: "8"
      });
    }

    console.log("--- Generating Purchase Orders ---");
    const pos = [];
    const poStatuses = ['Draft', 'Pending Approval', 'Approved', 'Sent', 'Delivered'];
    for(let i=0; i<5; i++) {
      const po = await db.insert(purchase_orders).values({
         companyId,
         poNumber: generateNumber('PO'),
         prId: prs[4+i].id, // some approved PRs
         csId: i === 2 ? csList[2].id : null, // link one to the approved CS
         vendorId: abcVendors[1].id,
         totalAmount: "10000",
         status: poStatuses[i],
         createdBy: requestorUid
      }).returning();
      pos.push(po[0]);

      await db.insert(po_items).values({
         poId: po[0].id,
         itemName: items[2].name,
         quantity: 20,
         uom: items[2].uom,
         unitPrice: "500"
      });
    }

    console.log("--- Generating GRN & QC ---");
    // Create GRN for the 'Delivered' PO (index 4)
    const grnObj = await db.insert(grn).values({
       companyId,
       warehouseId: warehouseList[0].id,
       grnNumber: generateNumber('GRN'),
       poId: pos[4].id,
       receivedBy: requestorUid,
       status: 'QC Completed'
    }).returning();
    
    const poItemsRes = await db.select().from(po_items).where(eq(po_items.poId, pos[4].id));
    const grnItemObj = await db.insert(grn_items).values({
       grnId: grnObj[0].id,
       poItemId: poItemsRes[0].id,
       quantityReceived: 20,
       status: 'Passed'
    }).returning();

    await db.insert(qc_inspections).values({
       grnItemId: grnItemObj[0].id,
       inspectedQty: 20,
       passedQty: 20,
       failedQty: 0,
       inspectedBy: requestorUid
    });

    console.log("--- Generating Invoices & Payments ---");
    const inv = await db.insert(invoices).values({
       companyId,
       invoiceNumber: generateNumber('INV'),
       poId: pos[4].id,
       grnId: grnObj[0].id,
       amount: "10000",
       status: 'Paid'
    }).returning();

    await db.insert(payments).values({
       companyId,
       paymentNumber: generateNumber('PAY'),
       invoiceId: inv[0].id,
       paymentMethod: 'Bank Transfer',
       amountPaid: "10000",
       status: 'Completed'
    });

    console.log("--- Generating Stock Transactions (In, Out, Transfer) ---");
    // Add base stock for some items so we can out/transfer
    await db.insert(warehouse_stock).values([
       { companyId, warehouseId: warehouseList[0].id, itemId: items[0].id, quantity: 50 },
       { companyId, warehouseId: warehouseList[0].id, itemId: items[1].id, quantity: 100 }
    ]);
    await db.insert(global_stock_ledger).values([
       { companyId, itemId: items[0].id, openingBalance: 0, totalStockIn: 50, totalStockOut: 0, closingBalance: 50 },
       { companyId, itemId: items[1].id, openingBalance: 0, totalStockIn: 100, totalStockOut: 0, closingBalance: 100 }
    ]);

    // 5 Stock Ins
    for(let i=0; i<5; i++) {
      await db.insert(stock_transactions).values({
         companyId,
         itemId: items[0].id,
         warehouseId: warehouseList[0].id,
         transactionType: 'Stock In',
         quantity: 10,
         performedBy: requestorUid
      });
    }

    // 5 Stock Out Requests
    const outStatuses = ['Pending', 'Pending', 'Approved', 'Approved', 'Rejected'];
    for(let i=0; i<5; i++) {
      const so = await db.insert(stock_out_requests).values({
         companyId,
         requestNumber: generateNumber('SO'),
         warehouseId: warehouseList[0].id,
         itemId: items[0].id,
         quantity: 5,
         reason: `Demo Stock Out ${i+1}`,
         status: outStatuses[i],
         requestedBy: requestorUid
      }).returning();

      if (outStatuses[i] === 'Approved') {
         await db.insert(stock_transactions).values({
           companyId,
           itemId: items[0].id,
           warehouseId: warehouseList[0].id,
           transactionType: 'Stock Out',
           quantity: 5,
           referenceId: so[0].requestNumber,
           performedBy: requestorUid
         });
      }
    }

    // 5 Stock Transfers
    const txStatuses = ['Pending Approval', 'Pending Approval', 'Transit', 'Received', 'Received'];
    for(let i=0; i<5; i++) {
      const st = await db.insert(stock_transfers).values({
         companyId,
         transferNumber: generateNumber('ST'),
         sourceWarehouseId: warehouseList[0].id,
         destinationWarehouseId: warehouseList[1].id,
         status: txStatuses[i],
         requestedBy: requestorUid
      }).returning();

      await db.insert(stock_transfer_items).values({
         transferId: st[0].id,
         itemId: items[1].id,
         quantity: 10
      });
    }

    console.log("All flows successfully generated!");
  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

run();
