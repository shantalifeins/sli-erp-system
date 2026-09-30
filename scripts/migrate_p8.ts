import { db } from '../src/shared/db/index.js';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('Starting Phase 8 Database Migration...');

  try {
    // 1. Create asset_assignments table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS asset_assignments (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        asset_id UUID REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
        assigned_to_uid TEXT REFERENCES users(uid) ON UPDATE CASCADE ON DELETE SET NULL,
        department_id INTEGER REFERENCES departments(id),
        branch_id INTEGER REFERENCES branches(id),
        location_id UUID REFERENCES asset_locations(id),
        assigned_at TIMESTAMP DEFAULT NOW(),
        returned_at TIMESTAMP,
        assigned_by_uid TEXT REFERENCES users(uid) ON UPDATE CASCADE ON DELETE SET NULL,
        status TEXT DEFAULT 'Active',
        notes TEXT
      );
    `);
    console.log('Created asset_assignments table.');

    console.log('Phase 8 Migration Completed Successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
