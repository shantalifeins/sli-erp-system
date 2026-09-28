import { execSync } from 'child_process';

// From DB check:
// Shanta Securities Limited = "7bed6e46-3313-416c-b096-360183cfab70" (WRONG company - where old users got created)
// Shanta Life Insurance PLC = "19b23b55-bc5b-440f-9de0-7d64051b2a86" (CORRECT company)

const WRONG_COMPANY_ID  = '7bed6e46-3313-416c-b096-360183cfab70';
const CORRECT_COMPANY_ID = '19b23b55-bc5b-440f-9de0-7d64051b2a86';

async function fixOldUsers() {
  const host = '10.16.49.78';
  const user = 'iamadmin';

  // Step 1: Check which users are under the wrong company
  const checkQuery = `SELECT id, email, company_id, role FROM users WHERE company_id = '${WRONG_COMPANY_ID}';`;

  const checkCode = `
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    async function main() {
      await client.connect();
      const res = await client.query(${JSON.stringify(checkQuery)});
      console.log('USERS_TO_FIX:', JSON.stringify(res.rows, null, 2));
      await client.end();
    }
    main().catch(err => { console.error('ERROR:', err.message); client.end(); });
  `;

  const checkB64 = Buffer.from(checkCode).toString('base64');
  const checkCmd = `ssh -o StrictHostKeyChecking=no ${user}@${host} "docker exec sli_erp_app node -e \\"eval(Buffer.from('${checkB64}', 'base64').toString('utf8'))\\""`;

  console.log("Step 1: Checking misplaced users...");
  const checkOutput = execSync(checkCmd, { encoding: 'utf-8' });
  console.log(checkOutput);

  // Step 2: Move those users to the correct company (Shanta Life Insurance PLC)
  const updateQuery = `
    UPDATE users 
    SET company_id = '${CORRECT_COMPANY_ID}' 
    WHERE company_id = '${WRONG_COMPANY_ID}'
    RETURNING id, email, company_id, role;
  `;

  const updateCode = `
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    async function main() {
      await client.connect();
      const res = await client.query(${JSON.stringify(updateQuery)});
      console.log('UPDATED_USERS:', JSON.stringify(res.rows, null, 2));
      console.log('Total updated:', res.rowCount);
      await client.end();
    }
    main().catch(err => { console.error('ERROR:', err.message); client.end(); });
  `;

  const updateB64 = Buffer.from(updateCode).toString('base64');
  const updateCmd = `ssh -o StrictHostKeyChecking=no ${user}@${host} "docker exec sli_erp_app node -e \\"eval(Buffer.from('${updateB64}', 'base64').toString('utf8'))\\""`;

  console.log("\nStep 2: Moving users to Shanta Life Insurance PLC...");
  const updateOutput = execSync(updateCmd, { encoding: 'utf-8' });
  console.log(updateOutput);

  // Step 3: Verify
  const verifyQuery = `SELECT id, email, company_id, role FROM users ORDER BY id;`;
  const verifyCode = `
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    async function main() {
      await client.connect();
      const res = await client.query(${JSON.stringify(verifyQuery)});
      console.log('ALL_USERS_AFTER_FIX:', JSON.stringify(res.rows, null, 2));
      await client.end();
    }
    main().catch(err => { console.error('ERROR:', err.message); client.end(); });
  `;

  const verifyB64 = Buffer.from(verifyCode).toString('base64');
  const verifyCmd = `ssh -o StrictHostKeyChecking=no ${user}@${host} "docker exec sli_erp_app node -e \\"eval(Buffer.from('${verifyB64}', 'base64').toString('utf8'))\\""`;

  console.log("\nStep 3: Verifying all users after fix...");
  const verifyOutput = execSync(verifyCmd, { encoding: 'utf-8' });
  console.log(verifyOutput);

  console.log("\n✅ Done! Old users should now appear in Shanta Life Insurance PLC.");
}

fixOldUsers().catch(err => {
  console.error("Script failed:", err);
  process.exit(1);
});
