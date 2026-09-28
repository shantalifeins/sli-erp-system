import { runSqlMigration } from './mcp-deploy-server.js';
import { db } from '../src/shared/db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
  console.log("=== CHECKING COMPANIES ON LIVE SERVER ===");
  const companySql = `SELECT id, name FROM companies;`;
  const companyRes = await runSqlMigration('10.16.49.78', 'iamadmin', companySql);
  console.log("Live Companies:", companyRes);

  console.log("\n=== CHECKING USERS ON LIVE SERVER ===");
  const userSql = `SELECT id, email, name, company_id, role, department, designation FROM users WHERE email LIKE '%shantasecurities%' OR email IN ('shafique@shantasecurities.com', 'imran@shantasecurities.com', 'asit@shantasecurities.com');`;
  const userRes = await runSqlMigration('10.16.49.78', 'iamadmin', userSql);
  console.log("Live Users:", userRes);

  console.log("\n=== CHECKING ALL USERS ON LIVE SERVER ===");
  const allUsersSql = `SELECT id, email, name, company_id FROM users;`;
  const allUsersRes = await runSqlMigration('10.16.49.78', 'iamadmin', allUsersSql);
  console.log("All Live Users:", allUsersRes);

  process.exit(0);
}

main();
