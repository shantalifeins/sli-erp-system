import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function testLogin(email: string) {
  const password = '123456';
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error(`Login Error for ${email}:`, error.message);
  } else {
    console.log(`Login Success for ${email}! User:`, data.user?.id);
  }
}

async function run() {
  await testLogin('amirul.nadim@shantalife.com');
  await testLogin('amirul.nadim1@shantalife.com');
  await testLogin('natasha.parvez@shantalife.com');
}

run();
