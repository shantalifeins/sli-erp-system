import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function sync() {
  const email = 'amirul.nadim1@shantalife.com';
  const uid = '89bcc1bf-4314-48b0-b32d-fa89ef66425d';

  console.log('Updating users table via Supabase API...');
  const { error } = await supabaseAdmin.from('users').update({ uid }).eq('email', email);
  if (error) {
    console.error('Failed:', error);
  } else {
    console.log('Successfully linked user!');
  }
}
sync();
