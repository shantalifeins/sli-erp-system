import { runSqlMigration } from './scripts/mcp-deploy-server';

async function main() {
  const sql = `SELECT * FROM todo_tasks ORDER BY created_at DESC LIMIT 5;`;
  const res = await runSqlMigration('10.16.49.78', 'iamadmin', sql);
  console.log(res);
}

main();
