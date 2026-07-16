import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '../src/shared/db/index.js';
import { 
    purchase_requisitions, pr_approvals, 
    comparative_statements, purchase_orders, stock_out_requests, 
    document_approvals, companies, stock_transfers
} from '../src/shared/db/schema.js';
import { eq, ilike, and, inArray } from 'drizzle-orm';

async function run() {
  const c = await db.select().from(companies).where(ilike(companies.name, '%abc%'));
  if (!c[0]) return;
  const companyId = c[0].id;

  const statusMatch = ['Pending', 'Pending Approval'];

  // 1. Purchase Requisitions
  const prs = await db.select().from(purchase_requisitions).where(and(
      eq(purchase_requisitions.companyId, companyId),
      inArray(purchase_requisitions.status, statusMatch)
  ));
  for (const pr of prs) {
      const existing = await db.select().from(pr_approvals).where(and(eq(pr_approvals.prId, pr.id), eq(pr_approvals.status, 'Pending')));
      if (existing.length === 0) {
          await db.insert(pr_approvals).values({
              prId: pr.id,
              stepOrder: 1,
              roleRequired: 'Super Admin',
              status: 'Pending'
          });
      }
  }

  // Helper for generic document_approvals
  async function fixDoc(items: any[], type: string) {
      for (const item of items) {
          const existing = await db.select().from(document_approvals).where(and(
              eq(document_approvals.documentType, type),
              eq(document_approvals.documentId, item.id),
              eq(document_approvals.status, 'Pending')
          ));
          if (existing.length === 0) {
              await db.insert(document_approvals).values({
                  companyId,
                  documentType: type,
                  documentId: item.id,
                  stepOrder: 1,
                  roleRequired: 'Super Admin',
                  status: 'Pending'
              });
          }
      }
  }

  // 2. Comparative Statements
  const css = await db.select().from(comparative_statements).where(and(
      eq(comparative_statements.companyId, companyId),
      inArray(comparative_statements.status, statusMatch)
  ));
  await fixDoc(css, 'CS');

  // 3. Purchase Orders
  const pos = await db.select().from(purchase_orders).where(and(
      eq(purchase_orders.companyId, companyId),
      inArray(purchase_orders.status, statusMatch)
  ));
  await fixDoc(pos, 'PO');

  // 4. Stock Out
  const stockOuts = await db.select().from(stock_out_requests).where(and(
      eq(stock_out_requests.companyId, companyId),
      inArray(stock_out_requests.status, statusMatch)
  ));
  await fixDoc(stockOuts, 'Stock Out Request');
  
  // 5. Stock Transfers
  const transfers = await db.select().from(stock_transfers).where(and(
      eq(stock_transfers.companyId, companyId),
      inArray(stock_transfers.status, statusMatch)
  ));
  await fixDoc(transfers, 'Stock Transfer');

  console.log("Successfully created missing 'Pending' approval steps using document_approvals.");
}

run().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
