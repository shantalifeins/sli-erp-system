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

async function run() {
  try {
    let companyRows = await db.select().from(companies).where(ilike(companies.name, '%abc%'));
    if (companyRows.length === 0) {
      console.log("ABC company not found.");
      return;
    }
    const companyId = companyRows[0].id;
    
    const abcUsers = await db.select().from(users).where(eq(users.companyId, companyId));

    // Fetch all Supabase users to match them correctly
    const allSbUsers = [];
    let page = 1;
    let hasMore = true;
    while(hasMore) {
       const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
       if (error || !data.users || data.users.length === 0) hasMore = false;
       else { allSbUsers.push(...data.users); page++; }
    }

    for (const u of abcUsers) {
      if (!u.email) continue;
      if (u.email.includes('1@')) {
        console.log(`Skipping ${u.email}, already has '1'`);
        continue;
      }

      // Find the user in Supabase by UID or Email
      const sbUser = allSbUsers.find(sb => sb.id === u.uid) || allSbUsers.find(sb => sb.email === u.email);
      const newEmail = u.email.replace('@', '1@');
      
      if (sbUser) {
        // Update Supabase
        const { error } = await supabaseAdmin.auth.admin.updateUserById(sbUser.id, { email: newEmail });
        if (error) {
          console.error(`Failed to update Supabase auth for ${u.email}:`, error.message);
          continue; // Skip DB update if Supabase fails to keep them in sync
        }
      } else {
        console.warn(`Warning: User ${u.email} not found in Supabase Auth, updating local DB only.`);
      }

      // Update Local DB
      await db.update(users).set({ email: newEmail }).where(eq(users.uid, u.uid));
      console.log(`Successfully updated: ${u.email} -> ${newEmail}`);
    }
    console.log("All updates completed successfully.");
  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

run();
