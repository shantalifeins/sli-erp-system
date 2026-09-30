import { db } from '../src/shared/db/index.js';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS attachments (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
        ref_type TEXT NOT NULL,
        ref_id TEXT NOT NULL,
        category TEXT,
        file_name TEXT NOT NULL,
        mime_type TEXT,
        size_bytes INTEGER,
        storage_path TEXT,
        storage_provider TEXT DEFAULT 'local',
        uploaded_by_uid TEXT REFERENCES users(uid) ON UPDATE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS attachments_ref_idx ON attachments(company_id, ref_type, ref_id)
        WHERE deleted_at IS NULL;
    `);
    console.log('Phase 6: attachments table created successfully');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
