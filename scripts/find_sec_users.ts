import { execSync } from 'child_process';

async function findSecUsers() {
  const host = '10.16.49.78';
  const user = 'iamadmin';

  const sqlQuery = `
    SELECT 
      (SELECT json_agg(c) FROM (SELECT id, name FROM companies) c) as companies,
      (SELECT json_agg(u) FROM (
        SELECT u.id, u.email, u.name, u.role, u.company_id, c.name as company_name 
        FROM users u 
        LEFT JOIN companies c ON u.company_id = c.id 
        WHERE u.email ILIKE '%shantasecurities%' 
           OR u.email ILIKE '%shafique%' 
           OR u.email ILIKE '%imran%' 
           OR u.email ILIKE '%asit%'
           OR u.name ILIKE '%shafique%'
           OR u.name ILIKE '%imran%'
           OR u.name ILIKE '%asit%'
      ) u) as target_users;
  `;

  const nodeCode = `
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    async function main() {
      await client.connect();
      const res = await client.query(\`${sqlQuery}\`);
      console.log(JSON.stringify(res.rows[0], null, 2));
      await client.end();
    }
    main().catch(err => { console.error('ERROR:', err.message); client.end(); });
  `;
  const b64 = Buffer.from(nodeCode).toString('base64');
  const sshCmd = `ssh -o StrictHostKeyChecking=no ${user}@${host} "docker exec sli_erp_app node -e \\"eval(Buffer.from('${b64}', 'base64').toString('utf8'))\\""`;

  const output = execSync(sshCmd, { encoding: 'utf-8' });
  console.log(output);
}

findSecUsers().catch(err => console.error("Error:", err));
