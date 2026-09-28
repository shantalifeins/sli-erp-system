import { execSync } from 'child_process';
import * as crypto from 'crypto';

const LIVE_HOST = '10.16.49.78';
const LIVE_SSH_USER = 'iamadmin';
const SHANTA_LIFE_COMPANY_ID = '19b23b55-bc5b-440f-9de0-7d64051b2a86';
const DEFAULT_PASSWORD = 'ShantalIfe@2026';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function safeStr(s: string | null | undefined): string {
  return s ? s.replace(/'/g, "''") : '';
}

const users = [
  { email: 'nafis.ahmed@shantalife.com',       name: 'Nafis Ahmed',           role: 'SU Employ', department: "CEO's Project & Secretary",      designation: 'Chief Executive Officer' },
  { email: 'natasha.parvez@shantalife.com',    name: 'Natasha Parvez',        role: 'SU Employ', department: "CEO's Project & Secretary",      designation: 'Senior Officer' },
  { email: 'mahfuz@shantalife.com',            name: 'Mahfuz',                role: 'SU Employ', department: 'Human Resources',                designation: 'DMD & CHRO' },
  { email: 'khurshid.kaiser@shantalife.com',   name: 'Khurshid Kaiser',       role: 'SU Employ', department: "CDO's Project & Secretary",      designation: 'DMD' },
  { email: 'akerto@shantalife.com',            name: 'Akerto F',              role: 'SU Employ', department: 'Marketing',                      designation: 'Senior Officer' },
  { email: 'faisal.kamal@shantalife.com',      name: 'Faisal Kamal',          role: 'SU Employ', department: 'Finance & Accounts',             designation: 'Deputy Manager' },
  { email: 'shaila.sheikh@shantalife.com',     name: 'Shaila Sheikh',         role: 'SU Employ', department: 'Policy & Customer Services',     designation: null },
  { email: 'rafiqul.ahmed@shantalife.com',     name: 'Rafiqul Ahmed',         role: 'SU Employ', department: 'Human Resources',                designation: null },
  { email: 'joy.chandra@shantalife.com',       name: 'Joy Chandra',           role: 'SU Employ', department: 'Information Technology',         designation: 'Assistant Manager' },
  { email: 'mahbub@shantalife.com',            name: 'Mahbub',                role: 'SU Employ', department: 'Corporate Business',             designation: 'Deputy Manager' },
  { email: 'saidur.tusher@shantalife.com',     name: 'Saidur Tusher',         role: 'SU Employ', department: 'Corporate Business',             designation: null },
  { email: 'kamran.hasan@shantalife.com',      name: 'Kamran Hasan',          role: 'SU Employ', department: 'Corporate Business',             designation: null },
  { email: 'zuhayer.m@shantalife.com',         name: 'Zuhayer M',             role: 'SU Employ', department: 'Finance & Accounts',             designation: 'Manager' },
  { email: 'tofayel.ahmed@shantalife.com',     name: 'Tofayel Ahmed',         role: 'SU Employ', department: 'Finance & Accounts',             designation: null },
  { email: 'lubna.akter@shantalife.com',       name: 'Lubna Akter',           role: 'SU Employ', department: 'Agency Services',                designation: 'Assistant Manager' },
  { email: 'joy.chandil@shantalife.com',       name: 'Joy Chandil',           role: 'SU Employ', department: 'Agency Services',                designation: null },
  { email: 'sahedulzaman@shantalife.com',      name: 'Sahedul Zaman',         role: 'SU Employ', department: 'Retail Business',                designation: null },
  { email: 'nazmul.islam@shantalife.com',      name: 'Nazmul Islam',          role: 'SU Employ', department: 'Retail Business',                designation: null },
  { email: 'md.abdurrahman@shantalife.com',    name: 'Md. Abdur Rahman',      role: 'SU Employ', department: 'Corporate Business',             designation: null },
  { email: 'mafazul.hossain@shantalife.com',   name: 'Mafazul Hossain',       role: 'SU Employ', department: 'Information Technology',         designation: null },
  { email: 'parbhe.halder@shantalife.com',     name: 'Parbhe Halder',         role: 'SU Employ', department: 'Agency Services',                designation: null },
  { email: 'shamim.ahmed@shantalife.com',      name: 'Shamim Ahmed',          role: 'SU Employ', department: 'Administration & Procurement',   designation: null },
  { email: 'arif.hossain@shantalife.com',      name: 'Arif Hossain',          role: 'SU Employ', department: 'Retail Business',                designation: null },
  { email: 'nurul.mursalin@shantalife.com',    name: 'Nurul Mursalin',        role: 'SU Employ', department: 'Retail Business',                designation: null },
  { email: 'milon.ahmed@shantalife.com',       name: 'Milon Ahmed',           role: 'SU Employ', department: 'Administration & Procurement',   designation: null },
  { email: 'mamun.hossain@shantalife.com',     name: 'Mamun Hossain',         role: 'SU Employ', department: 'Administration & Procurement',   designation: null },
  { email: 'tanvir.jalal@shantalife.com',      name: 'Tanvir Jalal',          role: 'SU Employ', department: 'Retail Business',                designation: null },
  { email: 'shahed@shantalife.com',            name: 'Shahed',                role: 'SU Employ', department: 'Retail Business',                designation: null },
  { email: 'hedayet@shantalife.com',           name: 'Hedayet',               role: 'SU Employ', department: 'Retail Business',                designation: null },
  { email: 'mamun.sarker@shantalife.com',      name: 'Mamun Sarker',          role: 'SU Employ', department: 'Retail Business',                designation: null },
  { email: 'rabeya.dilruba@shantalife.com',    name: 'Rabeya Dilruba',        role: 'SU Employ', department: 'Bancassurance',                  designation: null },
  { email: 'jannatul.ferdous@shantalife.com',  name: 'Jannatul Ferdous',      role: 'SU Employ', department: 'Bancassurance',                  designation: null },
  { email: 'nazmul.hasan@shantalife.com',      name: 'Nazmul Hasan',          role: 'SU Employ', department: 'Information Technology',         designation: null },
  { email: 'zaved.sadman@shantalife.com',      name: 'Zaved Sadman',          role: 'SU Employ', department: 'Information Technology',         designation: null },
  { email: 'mahmud.ali@shantalife.com',        name: 'Mahmud Ali',            role: 'SU Employ', department: 'Corporate Business',             designation: null },
  { email: 'faysal@shantalife.com',            name: 'Faysal',                role: 'SU Employ', department: 'Corporate Business',             designation: null },
  { email: 'salid.islam@shantalife.com',       name: 'Salid Islam',           role: 'SU Employ', department: 'Claims & Hospital Management',   designation: null },
  { email: 'mehedi.hasan@shantalife.com',      name: 'Mehedi Hasan',          role: 'SU Employ', department: 'Finance & Accounts',             designation: null },
  { email: 'sadhinuzzaman@shantalife.com',     name: 'Sadhinuzzaman',         role: 'SU Employ', department: 'Administration & Procurement',   designation: null },
  { email: 'fariduzzaman@shantalife.com',      name: 'Fariduzzaman',          role: 'SU Employ', department: 'Administration & Procurement',   designation: null },
  { email: 'sadmin@shantalife.com',            name: 'Sadmin',                role: 'SU Employ', department: 'Administration',                 designation: null },
  { email: 'nur.azem@shantalife.com',          name: 'Nur Azem',              role: 'SU Employ', department: 'Information Technology',         designation: null },
  { email: 'tasnim.rahman@shantalife.com',     name: 'Tasnim Rahman',         role: 'SU Employ', department: 'Finance & Accounts',             designation: null },
  { email: 'joseph.s@shantalife.com',          name: 'Joseph S',              role: 'SU Employ', department: 'Corporate Business',             designation: null },
  { email: 'suvash@shantalife.com',            name: 'Suvash',                role: 'SU Employ', department: 'Senior Corp',                    designation: null },
  { email: 'ahmed.adnan@shantalife.com',       name: 'Ahmed Adnan',           role: 'SU Employ', department: 'Claims & Hospital Management',   designation: null },
  { email: 'zaved@shantalife.com',             name: 'Zaved',                 role: 'SU Employ', department: 'Finance & Accounts',             designation: null },
  { email: 'mohsin.bhuiya@shantalife.com',     name: 'Mohsin Bhuiya',         role: 'SU Employ', department: 'Retail Business',                designation: null },
  { email: 'jannat@shantalife.com',            name: 'Jannat',                role: 'SU Employ', department: 'Retail Business',                designation: null },
  { email: 'abdur.rahman@shantalife.com',      name: 'Abdur Rahman',          role: 'SU Employ', department: 'Retail Business',                designation: null },
  { email: 'saidul.islam@shantalife.com',      name: 'Saidul Islam',          role: 'SU Employ', department: 'Retail Business',                designation: null },
  { email: 'md.fahim@shantalife.com',          name: 'Md. Fahim',             role: 'SU Employ', department: 'Finance & Accounts',             designation: null },
  { email: 'ohidol.islam@shantalife.com',      name: 'Ohidol Islam',          role: 'SU Employ', department: 'Retail Business',                designation: null },
  { email: 'nahid.hasan@shantalife.com',       name: 'Nahid Hasan',           role: 'SU Employ', department: 'Retail Business',                designation: null },
  { email: 'abu.bakar@shantalife.com',         name: 'Abu Bakar',             role: 'SU Employ', department: 'Retail Business',                designation: null },
  { email: 'arindo.ahmed@shantalife.com',      name: 'Arindo Ahmed',          role: 'SU Employ', department: 'Actuarial & Reinsurance',         designation: null },
  { email: 'mosiag.ahmed@shantalife.com',      name: 'Mosiag Ahmed',          role: 'SU Employ', department: 'Retail Business',                designation: null },
  { email: 'robaya.sultana@shantalife.com',    name: 'Robaya Sultana',        role: 'SU Employ', department: 'Business Development',           designation: null },
  { email: 'bulbul@shantalife.com',            name: 'Bulbul',                role: 'SU Employ', department: 'Business Development',           designation: null },
  { email: 'romel@shantalife.com',             name: 'Romel',                 role: 'SU Employ', department: 'Marketing',                      designation: null },
  { email: 'foysal.islam@shantalife.com',      name: 'Foysal Islam',          role: 'SU Employ', department: "CEO's Project & Secretary",      designation: null },
  { email: 'childs.kaiser@shantalife.com',     name: 'Childs Kaiser',         role: 'SU Employ', department: "CDO's Project & Secretary",      designation: null },
  { email: 'thandel.hasan@shantalife.com',     name: 'Thandel Hasan',         role: 'SU Employ', department: 'Retail Business',                designation: null },
  { email: 'shaila.vice@shantalife.com',       name: 'Shaila Vice',           role: 'SU Employ', department: 'Policy & Customer Services',     designation: null },
  { email: 'sarab.basar@shantalife.com',       name: 'Sarab Basar',           role: 'SU Employ', department: 'Information Technology',         designation: null },
  { email: 'khurshid.hasan@shantalife.com',    name: 'Khurshid Hasan',        role: 'SU Employ', department: 'Retail Business',                designation: null },
  { email: 'barnali.hasan@shantalife.com',     name: 'Barnali Hasan',         role: 'SU Employ', department: 'Corporate Business',             designation: null },
  { email: 'nahid.hasan2@shantalife.com',      name: 'Nahid Hasan 2',         role: 'SU Employ', department: 'Retail Business',                designation: null },
];

async function migrate() {
  console.log(`📋 Building single SQL batch for ${users.length} users...\n`);

  // Build ALL inserts as one SQL batch - single SSH call!
  const valueRows = users.map(u => {
    const uid = crypto.randomUUID();
    const pwHash = hashPassword(DEFAULT_PASSWORD);
    return `(
  '${uid}',
  '${safeStr(u.email)}',
  ${u.name ? `'${safeStr(u.name)}'` : 'NULL'},
  ${u.designation ? `'${safeStr(u.designation)}'` : 'NULL'},
  ${u.department ? `'${safeStr(u.department)}'` : 'NULL'},
  '${u.role || 'SU Employ'}',
  '${pwHash}',
  'Active',
  '${SHANTA_LIFE_COMPANY_ID}'
)`;
  }).join(',\n');

  const batchSQL = `
DO $$
DECLARE
  v_email TEXT;
BEGIN
  FOR v_email IN VALUES ${users.map(u => `('${safeStr(u.email)}')`).join(',')}
  LOOP
    -- skip if already exists
  END LOOP;
END $$;

INSERT INTO users (uid, email, name, designation, department, role, password_hash, status, company_id)
SELECT uid, email, name, designation, department, role, password_hash, status, company_id
FROM (VALUES ${valueRows}) AS v(uid, email, name, designation, department, role, password_hash, status, company_id)
WHERE v.email NOT IN (SELECT email FROM users WHERE email IS NOT NULL);
  `.trim();

  const nodeCode = `
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
const sql = ${JSON.stringify(batchSQL)};
async function main() {
  await client.connect();
  const res = await client.query(sql);
  console.log('INSERTED_ROWS:', res.rowCount);

  // Final count
  const countRes = await client.query(
    \`SELECT u.id, u.email, u.name, u.role, c.name as company
     FROM users u
     LEFT JOIN companies c ON u.company_id = c.id
     ORDER BY u.id\`
  );
  console.log('TOTAL_USERS:', countRes.rows.length);
  countRes.rows.forEach(r =>
    console.log('  [' + r.id + '] ' + r.email + ' | ' + r.role + ' | ' + (r.company || 'NULL'))
  );
  await client.end();
}
main().catch(err => { console.error('ERR:', err.message); client.end(); process.exit(1); });
  `.trim();

  const b64 = Buffer.from(nodeCode).toString('base64');
  const sshCmd = `ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30 ${LIVE_SSH_USER}@${LIVE_HOST} "docker exec sli_erp_app node -e \\"eval(Buffer.from('${b64}', 'base64').toString('utf8'))\\""`;

  console.log('🚀 Sending batch INSERT via single SSH call...\n');
  try {
    const output = execSync(sshCmd, { encoding: 'utf-8', timeout: 60000 });
    console.log(output);
    console.log(`\n✅ Migration complete!`);
    console.log(`🔑 Default password for all new users: "${DEFAULT_PASSWORD}"`);
    console.log(`   → Admin should reset passwords after first login.\n`);
  } catch (err: any) {
    console.error('❌ SSH Error:', err.message);
    process.exit(1);
  }
}

migrate();
