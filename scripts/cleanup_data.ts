import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '../src/shared/db/index.js';
import { sql } from 'drizzle-orm';

async function cleanupAndReseed() {
  try {
    console.log("Truncating old data...");
    
    // We will execute a raw SQL to truncate all procurement tables to start fresh
    await db.execute(sql`
      TRUNCATE TABLE 
        invoices,
        qc_inspections,
        grn_items,
        grn,
        po_items,
        purchase_orders,
        comparative_statements,
        quotations,
        rfq_vendors,
        rfq,
        document_approvals,
        pr_approvals,
        approval_workflows,
        bpmn_instances,
        pr_items,
        purchase_requisitions,
        inbox_tasks
      CASCADE;
    `);

    console.log("All procurement and inbox data truncated!");
    process.exit(0);
  } catch (error) {
    console.error("Error during cleanup:", error);
    process.exit(1);
  }
}

cleanupAndReseed();
