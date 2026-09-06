import * as dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';
import { db } from './src/shared/db/index.js';
import { users } from './src/shared/db/schema.js';
import { eq, ilike } from 'drizzle-orm';
import { hashPassword } from './src/shared/lib/authUtils.js';

async function main() {
  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const email = 'shantalifeins@gmail.com';
  const targetPassword = 'password123';
  const newHash = hashPassword(targetPassword);

  console.log(`Resetting Super Admin: ${email}`);

  // 1. Check / update Supabase Auth
  const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
  if (listErr) {
    console.error('Supabase listUsers error:', listErr);
  } else {
    const existing = list.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (existing) {
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password: targetPassword,
        email_confirm: true
      });
      if (updateErr) {
        console.error('Supabase updateUserById error:', updateErr);
      } else {
        console.log('✅ Supabase Auth password updated successfully.');
      }
      // Ensure UID matches in PG
      await db.update(users).set({ uid: existing.id, passwordHash: newHash, role: 'Super Admin', status: 'Active' }).where(ilike(users.email, email));
    } else {
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: targetPassword,
        email_confirm: true
      });
      if (createErr) {
        console.error('Supabase createUser error:', createErr);
      } else if (newUser?.user) {
        console.log('✅ Created user in Supabase Auth:', newUser.user.id);
        await db.update(users).set({ uid: newUser.user.id, passwordHash: newHash, role: 'Super Admin', status: 'Active' }).where(ilike(users.email, email));
      }
    }
  }

  // 2. Also update PostgreSQL passwordHash directly
  await db.update(users).set({ passwordHash: newHash, role: 'Super Admin', status: 'Active' }).where(ilike(users.email, email));
  console.log('✅ PostgreSQL users table updated with new password hash.');

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
