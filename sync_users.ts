import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function syncUsers() {
  // 1. Get all PG users
  const res = await pool.query(`SELECT uid, email, name FROM users WHERE email LIKE '%@shantalife.com'`);
  const pgUsers = res.rows;
  console.log(`Found ${pgUsers.length} users in PostgreSQL users table with @shantalife.com`);

  // 2. Get all GoTrue users
  let allGoTrueUsers: any[] = [];
  let page = 1;
  while (true) {
    const { data: usersData, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) { console.error(error); return; }
    if (usersData.users.length === 0) break;
    allGoTrueUsers = allGoTrueUsers.concat(usersData.users);
    page++;
  }
  
  const goTrueEmails = new Set(allGoTrueUsers.map(u => u.email?.toLowerCase()));
  console.log(`Found ${goTrueEmails.size} total users in GoTrue.`);

  // 3. Find missing users
  const missingUsers = pgUsers.filter(u => u.email && !goTrueEmails.has(u.email.toLowerCase()));
  console.log(`Found ${missingUsers.length} users missing from GoTrue!`);

  // 4. Create them in GoTrue
  let createdCount = 0;
  for (const user of missingUsers) {
    console.log(`Creating user in GoTrue: ${user.email} (UID: ${user.uid})`);
    
    // We must create them with the exact UID they have in PG
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: user.email,
      password: '123456',
      email_confirm: true,
      user_metadata: { name: user.name }
    });
    
    if (error) {
      console.log(`Failed to create ${user.email}:`, error.message);
    } else if (data?.user) {
      // The newly created user will have a NEW uid in GoTrue. 
      // We must update the PostgreSQL table to match the new UID!
      const newUid = data.user.id;
      await pool.query(`UPDATE users SET uid = $1 WHERE email = $2`, [newUid, user.email]);
      console.log(`Created ${user.email} and updated PG UID to ${newUid}`);
      createdCount++;
    }
  }
  
  console.log(`Successfully created ${createdCount} missing users.`);
  
  // Also, for users that DO exist in both, let's just make absolutely sure their passwords are all 123456.
  const existingInBoth = pgUsers.filter(u => u.email && goTrueEmails.has(u.email.toLowerCase()));
  for (const user of existingInBoth) {
    const goTrueUser = allGoTrueUsers.find(u => u.email?.toLowerCase() === user.email?.toLowerCase());
    if (goTrueUser) {
      await supabaseAdmin.auth.admin.updateUserById(goTrueUser.id, { password: '123456' });
    }
  }
  console.log(`Re-reset passwords for existing users just in case.`);
}

syncUsers().then(() => process.exit(0)).catch(console.error);
