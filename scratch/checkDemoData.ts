import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '../src/shared/db/index.js';
import { companies, comparative_statements, purchase_orders, work_orders } from '../src/shared/db/schema.js';

async function run() {
  const allCompanies = await db.select().from(companies);
  console.log("Companies:", allCompanies.map(c => ({ id: c.id, name: c.name, slug: c.slug })));

  const allCs = await db.select().from(comparative_statements);
  console.log("Total Comparative Statements:", allCs.length);

  const allPo = await db.select().from(purchase_orders);
  console.log("Total Purchase Orders:", allPo.length);

  const allWo = await db.select().from(work_orders);
  console.log("Total Work Orders:", allWo.length);

  process.exit(0);
}

run().catch(console.error);
