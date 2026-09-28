import { runSqlMigration } from './mcp-deploy-server.js';

async function updateAdmin() {
  const sql = `
    UPDATE users 
    SET company_id = '19b23b55-bc5b-440f-9de0-7d64051b2a86' 
    WHERE email = 'shantalifeins@gmail.com' OR (role = 'Super Admin' AND company_id IS NULL);
  `;
  try {
    const res = await runSqlMigration('10.16.49.78', 'iamadmin', sql);
    console.log('Update result:', res);
  } catch (err) {
    console.error('Update failed:', err);
  }
}

updateAdmin();
