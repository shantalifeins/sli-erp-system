import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function check() {
  const { data, error } = await supabaseAdmin.from('users').select('*').eq('email', 'amirul.nadim1@shantalife.com');
  if (error) {
    console.error(error);
  } else {
    console.log('Local DB Users for amirul.nadim1:', data);
  }
}
check();
