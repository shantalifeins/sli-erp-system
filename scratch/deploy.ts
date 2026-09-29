import { pullAndDeploy, runSqlMigration } from '../scripts/mcp-deploy-server.js';
import fs from 'fs';

async function main() {
  const host = '10.16.49.78';
  const user = 'iamadmin';

  console.log('Running SQL Migration...');
  const sqlContent = fs.readFileSync('drizzle/0003_digital_assets.sql', 'utf-8');
  const sqlCommands = sqlContent.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);

  // Note: normally migrations run sequentially. We can just pass the whole SQL block if it works.
  for (const cmd of sqlCommands) {
    console.log(await runSqlMigration(host, user, cmd));
  }

  console.log('Pulling and Deploying...');
  const deployOutput = await pullAndDeploy(host, user, 'main');
  console.log(deployOutput);
}

main().catch(console.error);
