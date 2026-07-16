import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './src/shared/db/schema.js';
import { eq } from 'drizzle-orm';
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});
const db = drizzle(pool, { schema });
async function update() {
  try {
    const items = await db.select().from(schema.inventory_items);
    console.log('Total items:', items.length);
    let count = 0;
    for (const item of items) {
      const isIt = Math.random() > 0.5;
      const basePrice = Math.floor(Math.random() * 900) + 100;
      await db.update(schema.inventory_items)
        .set({ 
          isAdminItem: !isIt, 
          isItItem: isIt,
          basePrice: basePrice.toString()
        })
        .where(eq(schema.inventory_items.id, item.id));
      count++;
    }
    console.log('Successfully updated ' + count + ' items with type and price');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}
update();
