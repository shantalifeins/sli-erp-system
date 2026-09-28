import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function migrate() {
  const url = process.env.DATABASE_URL;
  console.log('Using URL:', url);
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    await client.query(`
      CREATE TABLE IF NOT EXISTS "asset_attributes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        "category_id" uuid NOT NULL REFERENCES asset_categories(id) ON DELETE CASCADE,
        "attribute_type" text NOT NULL,
        "value" text NOT NULL,
        "created_at" timestamp DEFAULT now()
      );
    `);
    console.log('Created asset_attributes table');

    const alterQueries = [
      `ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "location_id" uuid REFERENCES asset_locations(id);`,
      `ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "brand_id" uuid REFERENCES asset_attributes(id);`,
      `ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "model_id" uuid REFERENCES asset_attributes(id);`,
      `ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "specification_id" uuid REFERENCES asset_attributes(id);`,
      `ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "size_value" text;`,
      `ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "uom_id" integer REFERENCES units(id);`
    ];

    for (const q of alterQueries) {
      await client.query(q);
      console.log('Executed:', q);
    }

    console.log('Migration successful');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

migrate();
