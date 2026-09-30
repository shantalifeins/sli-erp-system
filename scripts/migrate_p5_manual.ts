import { db } from '../src/shared/db/index.js';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS digital_acceptances (
        id SERIAL PRIMARY KEY,
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
        grn_id INTEGER REFERENCES grn(id),
        po_item_id INTEGER REFERENCES po_items(id),
        accepted_by_uid TEXT REFERENCES users(uid) ON UPDATE CASCADE,
        accepted_at TIMESTAMP DEFAULT NOW(),
        license_type TEXT,
        seats INTEGER DEFAULT 1,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        agreement_ref TEXT,
        entitlement_ref TEXT,
        status TEXT DEFAULT 'Pending'
      );

      ALTER TABLE digital_assets
        ADD COLUMN IF NOT EXISTS accounting_treatment TEXT DEFAULT 'Prepaid',
        ADD COLUMN IF NOT EXISTS po_item_id INTEGER REFERENCES po_items(id),
        ADD COLUMN IF NOT EXISTS invoice_id INTEGER REFERENCES invoices(id),
        ADD COLUMN IF NOT EXISTS acceptance_id INTEGER REFERENCES digital_acceptances(id),
        ADD COLUMN IF NOT EXISTS agreement_ref TEXT,
        ADD COLUMN IF NOT EXISTS entitlement_ref TEXT,
        ADD COLUMN IF NOT EXISTS cost_status TEXT DEFAULT 'Provisional',
        ADD COLUMN IF NOT EXISTS put_to_use_date TIMESTAMP,
        ADD COLUMN IF NOT EXISTS service_start_date TIMESTAMP,
        ADD COLUMN IF NOT EXISTS service_end_date TIMESTAMP,
        ADD COLUMN IF NOT EXISTS license_key_iv TEXT,
        ADD COLUMN IF NOT EXISTS license_key_tag TEXT;
    `);
    console.log('Phase 5 manual migration applied');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
