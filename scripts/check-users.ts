import { runSqlMigration } from './mcp-deploy-server.js';

async function checkUsers() {
  const sqlQuery = `
    SELECT id, email, company_id, uid FROM users;
  `;
  const result = await runSqlMigration('10.16.49.78', 'iamadmin', sqlQuery);
  console.log("Check Output:", result);
}
checkUsers();
