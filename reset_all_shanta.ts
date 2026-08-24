import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function check() {
  let allUsers: any[] = [];
  let page = 1;
  const perPage = 1000;
  
  while (true) {
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({
      page: page,
      perPage: perPage
    });
    
    if (error) {
      console.error(error);
      return;
    }
    
    if (users.users.length === 0) break;
    allUsers = allUsers.concat(users.users);
    page++;
  }
  
  const shantaUsers = allUsers.filter(u => u.email?.includes('shantalife.com'));
  console.log(`Found ${shantaUsers.length} Shanta Life users in total in GoTrue.`);
  
  // Reset all to 123456
  for (const u of shantaUsers) {
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(u.id, {
      password: '123456'
    });
    if (updateErr) {
      console.log(`Failed to reset ${u.email}:`, updateErr.message);
    } else {
      console.log(`Reset ${u.email} to 123456`);
    }
  }
}

check();
