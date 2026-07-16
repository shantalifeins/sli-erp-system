import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '../src/shared/db/index.js';
import { 
  companies, purchase_requisitions, stock_out_requests, 
  comparative_statements, purchase_orders, inbox_tasks 
} from '../src/shared/db/schema.js';
import { eq, inArray, ilike } from 'drizzle-orm';

async function run() {
  try {
    const companyRows = await db.select().from(companies).where(ilike(companies.name, '%abc%'));
    if (companyRows.length === 0) return;
    const companyId = companyRows[0].id;

    console.log("Generating Inbox Tasks for pending items...");

    // 1. Purchase / Item Requisitions
    const prs = await db.select().from(purchase_requisitions).where(
      inArray(purchase_requisitions.status, ['Pending', 'Pending Approval'])
    );
    for (const pr of prs) {
      if (pr.companyId !== companyId) continue;
      
      const docType = pr.prNumber.startsWith('IR-') ? 'Item Requisition' : 'Purchase Requisition';
      const refType = docType === 'Item Requisition' ? 'IR' : 'PR';

      await db.insert(inbox_tasks).values({
        companyId,
        assignedToRole: 'Super Admin', // Fallback for Super Admin
        category: 'Procurement',
        title: `Approval Required: ${docType} ${pr.prNumber}`,
        message: `Please review and approve ${docType} ${pr.prNumber} requested by ${pr.requestor}.`,
        referenceType: refType,
        referenceId: pr.id,
        status: 'Pending'
      });
    }

    // 2. Stock Out Requests
    const sor = await db.select().from(stock_out_requests).where(
      inArray(stock_out_requests.status, ['Pending', 'Pending Approval'])
    );
    for (const req of sor) {
      if (req.companyId !== companyId) continue;
      
      await db.insert(inbox_tasks).values({
        companyId,
        assignedToRole: 'Super Admin',
        category: 'Inventory',
        title: `Approval Required: Stock Out Request ${req.requestNumber}`,
        message: `Please review stock out request ${req.requestNumber}.`,
        referenceType: 'Stock Out',
        referenceId: req.id,
        status: 'Pending'
      });
    }

    // 3. CS Evaluations
    const css = await db.select().from(comparative_statements).where(
      inArray(comparative_statements.status, ['Pending', 'Pending Approval'])
    );
    for (const cs of css) {
      if (cs.companyId !== companyId) continue;

      await db.insert(inbox_tasks).values({
        companyId,
        assignedToRole: 'Super Admin',
        category: 'Procurement',
        title: `Approval Required: CS Evaluation ${cs.csNumber}`,
        message: `Please review CS Evaluation ${cs.csNumber}.`,
        referenceType: 'CS',
        referenceId: cs.id,
        status: 'Pending'
      });
    }

    // 4. Purchase Orders
    const pos = await db.select().from(purchase_orders).where(
      inArray(purchase_orders.status, ['Pending', 'Pending Approval'])
    );
    for (const po of pos) {
      if (po.companyId !== companyId) continue;

      await db.insert(inbox_tasks).values({
        companyId,
        assignedToRole: 'Super Admin',
        category: 'Procurement',
        title: `Approval Required: Purchase Order ${po.poNumber}`,
        message: `Please review Purchase Order ${po.poNumber}.`,
        referenceType: 'PO',
        referenceId: po.id,
        status: 'Pending'
      });
    }

    console.log("Inbox tasks inserted successfully!");
  } catch (error) {
    console.error("Error inserting inbox tasks:", error);
  }
  process.exit(0);
}

run();
