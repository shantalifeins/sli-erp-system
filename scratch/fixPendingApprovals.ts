import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '../src/shared/db/index.js';
import { 
    purchase_requisitions, pr_approvals, 
    comparative_statements, cs_approvals, 
    purchase_orders, po_approvals, 
    stock_out_requests, stock_out_approvals,
    companies
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
              companyId,
              prId: pr.id,
              stepOrder: 1,
              roleRequired: 'Super Admin',
              status: 'Pending'
          });
      }
  }

  // 2. Comparative Statements
  const css = await db.select().from(comparative_statements).where(and(
      eq(comparative_statements.companyId, companyId),
      inArray(comparative_statements.status, statusMatch)
  ));
  for (const cs of css) {
      const existing = await db.select().from(cs_approvals).where(and(eq(cs_approvals.csId, cs.id), eq(cs_approvals.status, 'Pending')));
      if (existing.length === 0) {
          await db.insert(cs_approvals).values({
              companyId,
              csId: cs.id,
              stepOrder: 1,
              roleRequired: 'Super Admin',
              status: 'Pending'
          });
      }
  }

  // 3. Purchase Orders
  const pos = await db.select().from(purchase_orders).where(and(
      eq(purchase_orders.companyId, companyId),
      inArray(purchase_orders.status, statusMatch)
  ));
  for (const po of pos) {
      const existing = await db.select().from(po_approvals).where(and(eq(po_approvals.poId, po.id), eq(po_approvals.status, 'Pending')));
      if (existing.length === 0) {
          await db.insert(po_approvals).values({
              companyId,
              poId: po.id,
              stepOrder: 1,
              roleRequired: 'Super Admin',
              status: 'Pending'
          });
      }
  }

  // 4. Stock Out
  const stockOuts = await db.select().from(stock_out_requests).where(and(
      eq(stock_out_requests.companyId, companyId),
      inArray(stock_out_requests.status, statusMatch)
  ));
  for (const so of stockOuts) {
      const existing = await db.select().from(stock_out_approvals).where(and(eq(stock_out_approvals.stockOutId, so.id), eq(stock_out_approvals.status, 'Pending')));
      if (existing.length === 0) {
          await db.insert(stock_out_approvals).values({
              companyId,
              stockOutId: so.id,
              stepOrder: 1,
              roleRequired: 'Super Admin',
              status: 'Pending'
          });
      }
  }

  console.log("Successfully created missing 'Pending' approval steps for all 'Pending Approval' documents in ABC company.");
}

run().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
