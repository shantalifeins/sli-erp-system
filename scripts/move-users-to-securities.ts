import { execSync } from 'child_process';
import { db } from '../src/shared/db/index.js';
import { sql } from 'drizzle-orm';

async function updateUsersCompany() {
  const targetCompanyId = '7bed6e46-3313-416c-b096-360183cfab70';
  const targetEmails = [
    'shafique@shantasecurities.com',
    'imran@shantasecurities.com',
    'asit@shantasecurities.com'
  ];

  console.log("=== UPDATING LOCAL DB ===");
  try {
    const localRes = await db.execute(sql`
      UPDATE users 
      SET company_id = ${targetCompanyId} 
      WHERE email IN ('shafique@shantasecurities.com', 'imran@shantasecurities.com', 'asit@shantasecurities.com')
      RETURNING id, name, email, company_id;
    `);
    console.log("Local Update Result:", localRes.rows);
  } catch (err: any) {
    console.error("Local DB Update Error:", err.message);
  }

  console.log("\n=== UPDATING LIVE SERVER DB ===");
  const host = '10.16.49.78';
  const user = 'iamadmin';

  const sqlQuery = `
    UPDATE users 
    SET company_id = '${targetCompanyId}' 
    WHERE email IN ('shafique@shantasecurities.com', 'imran@shantasecurities.com', 'asit@shantasecurities.com')
    RETURNING id, name, email, company_id;
  `;

  const nodeCode = `
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    async function main() {
      await client.connect();
      const res = await client.query(\`${sqlQuery}\`);
      console.log('UPDATED USERS COUNT:', res.rowCount);
      console.log(JSON.stringify(res.rows, null, 2));
      await client.end();
    }
    main().catch(err => { console.error('ERROR:', err.message); client.end(); });
  `;
  const b64 = Buffer.from(nodeCode).toString('base64');
  const sshCmd = `ssh -o StrictHostKeyChecking=no ${user}@${host} "docker exec sli_erp_app node -e \\"eval(Buffer.from('${b64}', 'base64').toString('utf8'))\\""`;

  try {
    const output = execSync(sshCmd, { encoding: 'utf-8' });
    console.log(output);
  } catch (err: any) {
    console.error("Live Server Update Error:", err.message);
  }
}

updateUsersCompany().catch(err => console.error(err));
