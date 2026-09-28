// Run after deployment to create asset_locations table on live server
// Usage: npx tsx scripts/migrate-asset-locations.ts
import { pullAndDeploy, runSqlMigration } from './mcp-deploy-server.js';

const SQL = `
CREATE TABLE IF NOT EXISTS asset_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES asset_locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
`;

const HOST = '10.16.49.78';
const USER = 'iamadmin';

async function main() {
  console.log('Running asset_locations migration on live server...');
  const result = await runSqlMigration(HOST, USER, SQL);
  console.log('Migration result:', result);
}

main().catch(err => { console.error('Migration failed:', err); process.exit(1); });
