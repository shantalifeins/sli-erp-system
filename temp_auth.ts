import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function test() {
  const email = 'Nadim@shantalifeins.onmicrosoft.com'; // or whatever the user is
  const randomPassword = crypto.randomUUID() + "A1!a";
  
  console.log('Fetching user...');
  const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) return console.error('List error:', listError);
  
  const u = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase() || u.email?.toLowerCase().includes('nadim'));
  if (!u) return console.error('User not found in GoTrue');
  
  console.log('Found user:', u.email, u.id);
  
  console.log('Updating password...');
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(u.id, { 
    password: randomPassword,
    email_confirm: true 
  });
  if (updateError) return console.error('Update error:', updateError);
  
  console.log('Password updated. Attempting sign in with original email:', u.email);
  let res = await supabaseAdmin.auth.signInWithPassword({
    email: u.email,
    password: randomPassword
  });
  console.log('Sign in with original email result:', res.error ? res.error.message : 'Success');

  console.log('Attempting sign in with uppercase email:', u.email.toUpperCase());
  res = await supabaseAdmin.auth.signInWithPassword({
    email: u.email.toUpperCase(),
    password: randomPassword
  });
  console.log('Sign in with uppercase email result:', res.error ? res.error.message : 'Success');
}

test();
