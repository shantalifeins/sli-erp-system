import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Use the ANON key for client-side login simulation
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function testLogin() {
  const email = 'natasha.parvez@shantalife.com';
  const password = '123456';
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error('Login Error:', error.message);
  } else {
    console.log('Login Success! User:', data.user?.id);
  }
}

testLogin();
