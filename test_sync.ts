import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function testSync() {
  const email = 'natasha.parvez@shantalife.com';
  const password = '123456';
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error('Login Error:', error.message);
    return;
  }
  
  const token = data.session?.access_token;
  console.log('Login Success! Token obtained.');

  const res = await fetch('https://sli-erp-system.vercel.app/api/auth/sync', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const body = await res.text();
  console.log(`Sync Status: ${res.status}`);
  console.log(`Sync Response: ${body}`);
}

testSync();
