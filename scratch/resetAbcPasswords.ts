import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '../src/shared/db/index.js';
import { companies, users } from '../src/shared/db/schema.js';
import { eq, ilike } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

const DEFAULT_PASSWORD = '123456';

async function run() {
  try {
    const companyRows = await db.select().from(companies).where(ilike(companies.name, '%abc%'));
    if (companyRows.length === 0) {
      console.log("ABC company not found.");
      return;
    }
    const companyId = companyRows[0].id;
    
    const abcUsers = await db.select().from(users).where(eq(users.companyId, companyId));
    console.log(`Setting default password for ${abcUsers.length} users...`);

    // Fetch all Supabase users to match them correctly
    const allSbUsers = [];
    let page = 1;
    let hasMore = true;
    while(hasMore) {
       const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
       if (error || !data.users || data.users.length === 0) hasMore = false;
       else { allSbUsers.push(...data.users); page++; }
    }

    let successCount = 0;
    for (const u of abcUsers) {
      if (!u.email) continue;
      
      const sbUser = allSbUsers.find(sb => sb.id === u.uid) || allSbUsers.find(sb => sb.email === u.email);
      
      if (sbUser) {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(sbUser.id, { 
          password: DEFAULT_PASSWORD,
          email_confirm: true // Just in case email confirmation is required
        });
        if (error) {
          console.error(`Failed to update password for ${u.email}:`, error.message);
        } else {
          successCount++;
          console.log(`Password reset for: ${u.email}`);
        }
      } else {
        console.warn(`User ${u.email} not found in Supabase Auth.`);
      }
    }
    console.log(`Successfully reset passwords for ${successCount} users.`);
  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

run();
