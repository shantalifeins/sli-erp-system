import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function reset() {
  const uid = 'd83a2b37-d85f-44bd-af9d-d26e4d4b5703';
  
  const { error } = await supabaseAdmin.auth.admin.updateUserById(uid, {
    password: '123456',
    email_confirm: true
  });
  
  if (error) {
    console.error('Failed to reset password:', error);
  } else {
    console.log('Password successfully reset to: 123456');
  }
}

reset();
