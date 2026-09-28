import { execSync } from 'child_process';

async function checkUsers() {
  const sqlQuery = `
    SELECT id, email, company_id, uid, role FROM users;
  `;
  const host = '10.16.49.78';
  const user = 'iamadmin';

  const nodeCode = `
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    async function main() {
      await client.connect();
      const res = await client.query(\`${sqlQuery}\`);
      console.log(JSON.stringify(res.rows, null, 2));
      await client.end();
    }
    main().catch(err => { console.error('SQL_MIGRATION_ERROR:', err.message); client.end(); });
  `;
  const b64 = Buffer.from(nodeCode).toString('base64');
  const sshCmd = `ssh -o StrictHostKeyChecking=no ${user}@${host} "docker exec sli_erp_app node -e \\"eval(Buffer.from('${b64}', 'base64').toString('utf8'))\\""`;

  try {
    const output = execSync(sshCmd, { encoding: 'utf-8' });
    console.log("Check Output:");
    console.log(output);
  } catch (err) {
    console.error("SSH Error", err);
  }
}
checkUsers();
