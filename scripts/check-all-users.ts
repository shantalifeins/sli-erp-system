import { execSync } from 'child_process';

async function checkAllUsers() {
  const host = '10.16.49.78';
  const user = 'iamadmin';

  // Check ALL users with their company names
  const sqlQuery = `
    SELECT u.id, u.email, u.name, u.role, u.company_id, c.name as company_name, u.status
    FROM users u
    LEFT JOIN companies c ON u.company_id = c.id
    ORDER BY u.id;
  `;

  const nodeCode = `
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    async function main() {
      await client.connect();
      const res = await client.query(\`${sqlQuery}\`);
      console.log('TOTAL USERS:', res.rows.length);
      console.log(JSON.stringify(res.rows, null, 2));
      await client.end();
    }
    main().catch(err => { console.error('ERROR:', err.message); client.end(); });
  `;
  const b64 = Buffer.from(nodeCode).toString('base64');
  const sshCmd = `ssh -o StrictHostKeyChecking=no ${user}@${host} "docker exec sli_erp_app node -e \\"eval(Buffer.from('${b64}', 'base64').toString('utf8'))\\""`;

  const output = execSync(sshCmd, { encoding: 'utf-8' });
  console.log(output);
}

checkAllUsers().catch(err => {
  console.error("Script failed:", err.message);
  process.exit(1);
});
