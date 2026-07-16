import { db } from './src/shared/db/db';
import { bpmn_definitions } from './src/shared/db/schema';
async function run() {
  const res = await db.select().from(bpmn_definitions);
  console.log(JSON.stringify(res.map(r => ({ id: r.id, name: r.name, documentType: r.documentType, companyId: r.companyId })), null, 2));
  process.exit(0);
}
run();
