import { db } from '../src/shared/db/index.js';
import fs from 'fs';
import path from 'path';
import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  try {
    const p = path.join(__dirname, '..', 'drizzle', '0004_overjoyed_dreadnoughts.sql');
    const s = fs.readFileSync(p, 'utf-8');
    await db.execute(sql.raw(s));
    console.log('Migrated');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
