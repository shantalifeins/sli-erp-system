import { runSqlMigration } from './scripts/mcp-deploy-server';

async function main() {
  const sql = `SELECT uid, name, email FROM users WHERE uid = 'c750479d-241b-417c-8f48-001aeac50a2f';`;
  const res = await runSqlMigration('10.16.49.78', 'iamadmin', sql);
  console.log(res);
}

main();
