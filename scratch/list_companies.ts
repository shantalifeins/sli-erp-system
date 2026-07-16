import { db } from './src/shared/db';
import { companies } from './src/shared/db/schema';
import { eq, ilike } from 'drizzle-orm';

async function main() {
  const allCompanies = await db.select().from(companies);
  console.log("Companies:", allCompanies.map(c => ({ id: c.id, name: c.name, slug: c.slug })));
  process.exit(0);
}
main();
