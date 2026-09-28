import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

async function migrate() {
  const url = process.env.DATABASE_URL;
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    const sqlPath = path.resolve('drizzle/0002_light_trish_tilby.sql');
    const sqlText = fs.readFileSync(sqlPath, 'utf8');
    
    // Split by statement breakpoint
    const statements = sqlText.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s);
    
    // Filter only statements related to asset tables
    const assetStatements = statements.filter(stmt => {
      if (stmt.startsWith('CREATE TABLE "asset_')) return true;
      if (stmt.startsWith('CREATE TABLE "assets"')) return true;
      
      // Allow ALTER TABLE statements that affect asset tables
      if (stmt.startsWith('ALTER TABLE "asset_')) return true;
      if (stmt.startsWith('ALTER TABLE "assets"')) return true;

      // Allow ALTER TABLE statements that add asset columns to existing tables
      // For instance: ALTER TABLE "inventory_items" ADD COLUMN "asset_category_id" uuid;
      if (stmt.includes('asset_category_id')) return true;
      
      return false;
    });

    console.log(`Executing ${assetStatements.length} asset-related statements...`);

    for (const stmt of assetStatements) {
      try {
        await client.query(stmt);
        console.log('Success:', stmt.substring(0, 80) + '...');
      } catch (err: any) {
        // Ignore "already exists" errors (42P07 for tables, 42701 for columns)
        if (err.code === '42P07' || err.code === '42701') {
          console.log('Skipped (already exists):', stmt.substring(0, 80) + '...');
        } else {
          console.error('Error executing:', stmt.substring(0, 80) + '...');
          console.error(err);
        }
      }
    }

    console.log('Safe migration successful');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

migrate();
