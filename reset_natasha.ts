import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function resetPass() {
  const email = 'natasha.parvez@shantalife.com';
  
  const { data: users, error: findError } = await supabaseAdmin.auth.admin.listUsers();
  const authUser = users?.users.find(u => u.email === email);

  if (!authUser) {
    console.error('User not found in GoTrue');
    return;
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
    password: '123456'
  });

  if (error) {
    console.error('Error resetting password:', error);
  } else {
    console.log('Successfully reset password for Natasha to 123456');
  }
}

resetPass();
