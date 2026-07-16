import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '../src/shared/db/index.js';
import { inbox_tasks } from '../src/shared/db/schema.js';
import { eq } from 'drizzle-orm';

async function run() {
  try {
    // 1. Update 'IR' to 'PR'
    await db.update(inbox_tasks)
      .set({ referenceType: 'PR' })
      .where(eq(inbox_tasks.referenceType, 'IR'));
      
    // 2. Update 'Stock Out' to 'StockOut'
    await db.update(inbox_tasks)
      .set({ referenceType: 'StockOut' })
      .where(eq(inbox_tasks.referenceType, 'Stock Out'));

    // 3. Delete 'PO' tasks because the frontend Inbox does not support PO approvals
    await db.delete(inbox_tasks)
      .where(eq(inbox_tasks.referenceType, 'PO'));

    console.log("Inbox task reference types fixed for the frontend!");
  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

run();
