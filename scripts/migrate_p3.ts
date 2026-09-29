import { db } from '../src/shared/db/index.js';
import { sql } from 'drizzle-orm';

async function migrate() {
  try {
    console.log('Running ALTER TABLE for Phase 3...');
    await db.execute(sql`
      ALTER TABLE po_items
        ADD COLUMN IF NOT EXISTS item_id INTEGER REFERENCES inventory_items(id),
        ADD COLUMN IF NOT EXISTS pr_item_id INTEGER REFERENCES pr_items(id),
        ADD COLUMN IF NOT EXISTS line_no INTEGER,
        ADD COLUMN IF NOT EXISTS received_quantity INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS invoiced_quantity INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 0,
        ADD COLUMN IF NOT EXISTS description TEXT;

      ALTER TABLE grn_items
        ADD COLUMN IF NOT EXISTS condition TEXT,
        ADD COLUMN IF NOT EXISTS remarks TEXT;

      CREATE TABLE IF NOT EXISTS grn_item_serials (
        id SERIAL PRIMARY KEY,
        company_id UUID REFERENCES companies(id),
        grn_item_id INTEGER REFERENCES grn_items(id) NOT NULL,
        serial_number TEXT NOT NULL,
        UNIQUE (company_id, serial_number)
      );

      CREATE TABLE IF NOT EXISTS digital_acceptances (
        id SERIAL PRIMARY KEY,
        company_id UUID REFERENCES companies(id),
        grn_id INTEGER REFERENCES grn(id),
        po_item_id INTEGER REFERENCES po_items(id),
        accepted_by_uid TEXT REFERENCES users(uid) ON UPDATE CASCADE,
        accepted_at TIMESTAMP DEFAULT NOW(),
        license_type TEXT, seats INTEGER DEFAULT 1,
        start_date TIMESTAMP, end_date TIMESTAMP,
        agreement_ref TEXT, entitlement_ref TEXT,
        status TEXT DEFAULT 'Pending'
      );

      CREATE TABLE IF NOT EXISTS document_sequences (
        id SERIAL PRIMARY KEY,
        company_id UUID REFERENCES companies(id),
        doc_type TEXT NOT NULL, year INTEGER NOT NULL,
        last_no INTEGER DEFAULT 0,
        UNIQUE (company_id, doc_type, year)
      );

      ALTER TABLE assets
        ADD COLUMN IF NOT EXISTS po_id INTEGER REFERENCES purchase_orders(id),
        ADD COLUMN IF NOT EXISTS po_item_id INTEGER REFERENCES po_items(id),
        ADD COLUMN IF NOT EXISTS source_grn_item_id INTEGER REFERENCES grn_items(id),
        ADD COLUMN IF NOT EXISTS unit_index INTEGER;

      CREATE UNIQUE INDEX IF NOT EXISTS assets_grn_item_unit_unq
        ON assets(source_grn_item_id, unit_index);
    `);

    console.log('Running data backfill for po_items...');
    // Backfill po_items.item_id by name-match within company
    // We join po_items with purchase_orders to get company_id
    await db.execute(sql`
      UPDATE po_items pi
      SET item_id = ii.id
      FROM purchase_orders po, inventory_items ii
      WHERE pi.po_id = po.id
        AND po.company_id = ii.company_id
        AND LOWER(TRIM(pi.item_name)) = LOWER(TRIM(ii.name))
        AND pi.item_id IS NULL;
    `);

    console.log('Migration and backfill completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

migrate();
