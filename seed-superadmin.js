import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seed() {
  const email = 'jetitbd@gmail.com'; // Default Super Admin email
  const password = '123456';

  console.log(`Creating superadmin user: ${email}...`);

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    if (error.message.includes('already exists') || error.message.includes('User already registered')) {
      console.log('User already exists in Auth! Please login with the email and password.');
    } else {
      console.error('Error creating user in Supabase Auth:', error);
    }
  } else {
    console.log('Successfully created user in Auth! UID:', data.user.id);
  }
}

seed().then(() => {
  console.log('Seed script finished.');
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
