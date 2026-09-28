import { runSqlMigration } from './mcp-deploy-server.js';

async function fixUsers() {
  console.log("Starting SQL migration via MCP...");

  const sqlQuery = `
    WITH fallback_company AS (
      SELECT id FROM companies LIMIT 1
    ),
    shanta_company AS (
      SELECT id FROM companies WHERE name ILIKE '%Shanta Life Insurance%' LIMIT 1
    )
    UPDATE users
    SET company_id = (SELECT id FROM shanta_company)
    WHERE company_id = (SELECT id FROM fallback_company)
      AND (SELECT id FROM shanta_company) IS NOT NULL
      AND (SELECT id FROM fallback_company) != (SELECT id FROM shanta_company);
  `;

  try {
    const result = await runSqlMigration('10.16.49.78', 'iamadmin', sqlQuery);
    console.log("Migration output:", result);
  } catch (err) {
    console.error("Migration failed:", err);
  }
}

fixUsers();
