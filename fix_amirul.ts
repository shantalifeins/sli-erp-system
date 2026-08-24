import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function fix() {
  const email = 'amirul.nadim1@shantalife.com';
  console.log('Fetching users...');
  const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) return console.error('List error:', listError);
  
  const u = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (!u) {
    return console.log('EXACT MATCH NOT FOUND IN GOTRUE FOR:', email);
  }
  
  console.log(`Found exactly: ${u.email} with id ${u.id}`);
  
  const { error } = await supabaseAdmin.auth.admin.updateUserById(u.id, {
    password: '123456',
    email_confirm: true
  });
  
  if (error) {
    console.error('Failed to reset password:', error);
  } else {
    console.log('Password successfully reset to: 123456');
  }
  
  const { data, error: loginErr } = await supabaseAdmin.auth.signInWithPassword({
    email: email,
    password: '123456'
  });
  
  if (loginErr) {
    console.error('Test login failed:', loginErr.message);
  } else {
    console.log('Test login SUCCEEDED!');
  }
}

fix();
