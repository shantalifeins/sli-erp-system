import { db } from '../src/shared/db/index.js';
import { sql } from 'drizzle-orm';

async function migrate() {
  try {
    console.log('Running ALTER TABLE for inventory_items...');
    await db.execute(sql`
      ALTER TABLE inventory_items
        ADD COLUMN IF NOT EXISTS asset_nature TEXT DEFAULT 'Physical',
        ADD COLUMN IF NOT EXISTS usage_purpose TEXT DEFAULT 'Internal Use',
        ADD COLUMN IF NOT EXISTS accounting_treatment TEXT DEFAULT 'Inventory',
        ADD COLUMN IF NOT EXISTS tracking_required BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS tracking_method TEXT DEFAULT 'None',
        ADD COLUMN IF NOT EXISTS receipt_mode TEXT DEFAULT 'Physical Receipt',
        ADD COLUMN IF NOT EXISTS item_category_id INTEGER REFERENCES item_categories(id),
        ADD COLUMN IF NOT EXISTS capitalization_threshold NUMERIC,
        ADD COLUMN IF NOT EXISTS useful_life_months INTEGER,
        ADD COLUMN IF NOT EXISTS depreciation_method TEXT,
        ADD COLUMN IF NOT EXISTS salvage_percent NUMERIC,
        ADD COLUMN IF NOT EXISTS digital_asset_type TEXT,
        ADD COLUMN IF NOT EXISTS default_license_type TEXT,
        ADD COLUMN IF NOT EXISTS default_billing_cycle TEXT,
        ADD COLUMN IF NOT EXISTS default_amortization_months INTEGER,
        ADD COLUMN IF NOT EXISTS default_cost_center_id INTEGER REFERENCES cost_centers(id),
        ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active',
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS barcode TEXT,
        ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(uid) ON UPDATE CASCADE,
        ADD COLUMN IF NOT EXISTS updated_by TEXT REFERENCES users(uid) ON UPDATE CASCADE,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

      CREATE UNIQUE INDEX IF NOT EXISTS inv_items_company_code_unq
        ON inventory_items(company_id, item_code);
    `);

    console.log('Running data backfill...');
    await db.execute(sql`
      UPDATE inventory_items SET
        asset_nature = CASE WHEN is_digital_asset = TRUE THEN 'Digital' ELSE 'Physical' END,
        accounting_treatment = CASE WHEN is_fixed_asset = TRUE THEN 'Capitalize'
                                    WHEN is_digital_asset = TRUE THEN 'Prepaid'
                                    ELSE 'Inventory' END,
        tracking_required = is_fixed_asset OR is_digital_asset,
        tracking_method = CASE WHEN is_fixed_asset = TRUE THEN 'Individual Unit'
                               WHEN is_digital_asset = TRUE THEN 'License'
                               ELSE 'None' END,
        receipt_mode = CASE WHEN is_digital_asset = TRUE THEN 'Digital Acceptance'
                            ELSE 'Physical Receipt' END;
                            
      UPDATE inventory_items ii
        SET item_category_id = ic.id
        FROM item_categories ic
        WHERE ic.company_id = ii.company_id
          AND LOWER(TRIM(ic.name)) = LOWER(TRIM(ii.category))
          AND ii.item_category_id IS NULL;
    `);

    console.log('Migration and backfill completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

migrate();
