import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function check() {
  const { data: user, error } = await supabaseAdmin.auth.admin.getUserById('d83a2b37-d85f-44bd-af9d-d26e4d4b5703');
  if (error) {
    console.error(error);
  } else {
    console.log('User belongs to email:', user.user.email);
  }
}
check();
