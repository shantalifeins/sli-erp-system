import { db } from '../src/shared/db/index.js';
import { sql } from 'drizzle-orm';

async function migrate() {
  try {
    console.log('Running ALTER TABLE for Phase 4...');
    await db.execute(sql`
      ALTER TABLE invoices
        ALTER COLUMN grn_id DROP NOT NULL,
        ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES vendors(id),
        ADD COLUMN IF NOT EXISTS vendor_invoice_no TEXT,
        ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'Goods',
        ADD COLUMN IF NOT EXISTS subtotal NUMERIC,
        ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0,
        ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0,
        ADD COLUMN IF NOT EXISTS freight_amount NUMERIC DEFAULT 0,
        ADD COLUMN IF NOT EXISTS due_date TIMESTAMP,
        ADD COLUMN IF NOT EXISTS match_status TEXT DEFAULT 'Matched',
        ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'Pending',
        ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(uid) ON UPDATE CASCADE;

      CREATE TABLE IF NOT EXISTS invoice_items (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES invoices(id) NOT NULL,
        po_item_id INTEGER REFERENCES po_items(id),
        grn_item_id INTEGER REFERENCES grn_items(id),
        item_id INTEGER REFERENCES inventory_items(id),
        description TEXT,
        quantity NUMERIC NOT NULL,
        unit_price NUMERIC NOT NULL,
        tax_amount NUMERIC DEFAULT 0,
        cost_type TEXT DEFAULT 'Base',
        capitalizable BOOLEAN DEFAULT TRUE
      );

      ALTER TABLE assets
        ADD COLUMN IF NOT EXISTS invoice_id INTEGER REFERENCES invoices(id),
        ADD COLUMN IF NOT EXISTS invoice_item_id INTEGER REFERENCES invoice_items(id),
        ADD COLUMN IF NOT EXISTS cost_status TEXT DEFAULT 'Provisional',
        ADD COLUMN IF NOT EXISTS is_capitalized BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS put_to_use_date TIMESTAMP,
        ADD COLUMN IF NOT EXISTS capitalization_date TIMESTAMP;

      CREATE TABLE IF NOT EXISTS accounting_events (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        company_id UUID REFERENCES companies(id),
        event_type TEXT NOT NULL,
        source_type TEXT, source_id TEXT,
        debit_account TEXT, credit_account TEXT,
        amount NUMERIC,
        status TEXT DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

migrate();
