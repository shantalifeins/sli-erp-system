import 'dotenv/config';
import { db } from './src/shared/db/index.js';
import { warehouse_managers } from './src/shared/db/schema.js';
import { eq } from 'drizzle-orm';

async function run() {
  const all = await db.select().from(warehouse_managers);
  
  const grouped = {};
  for (const m of all) {
    const key = m.userId + '-' + m.warehouseId;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  }
  
  for (const key in grouped) {
    if (grouped[key].length > 1) {
      console.log('Found duplicate:', grouped[key]);
      const toDelete = grouped[key].slice(1);
      const toKeep = grouped[key][0];
      
      for (const d of toDelete) {
        await db.delete(warehouse_managers).where(eq(warehouse_managers.id, d.id));
        console.log('Deleted duplicate id:', d.id);
      }
      
      await db.update(warehouse_managers).set({ itemType: 'IT' }).where(eq(warehouse_managers.id, toKeep.id));
      console.log('Updated to Keep to IT, id:', toKeep.id);
    }
  }
  
  process.exit(0);
}
run();
