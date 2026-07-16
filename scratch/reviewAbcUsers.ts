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
    console.log(`\n--- ABC Company User Review ---`);
    console.log(`Total DB users under ABC Company: ${abcUsers.length}`);

    // fetch all users from supabase (pagination might be needed if > 50, but let's try standard list)
    // listUsers defaults to returning 50. Let's fetch more if possible, or just check one by one.
    // For simplicity, we will just list all and check.
    const allSbUsers = [];
    let page = 1;
    let hasMore = true;
    while(hasMore) {
       const { data, error } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: 1000
       });
       if (error || !data.users || data.users.length === 0) {
          hasMore = false;
       } else {
          allSbUsers.push(...data.users);
          page++;
       }
    }
    
    console.log(`Total users in Supabase Auth (Global): ${allSbUsers.length}\n`);

    let missingCount = 0;
    for(const u of abcUsers) {
      const matchInSb = allSbUsers.find(sb => sb.id === u.uid);
      const emailMatchInSb = allSbUsers.find(sb => sb.email === u.email);
      
      let status = "";
      if (matchInSb) {
        status = "✅ Found in Supabase";
      } else if (emailMatchInSb) {
        status = `⚠️ UID mismatch! Found in SB with UID ${emailMatchInSb.id}`;
        missingCount++;
      } else {
        status = "❌ MISSING in Supabase Auth entirely";
        missingCount++;
      }
      console.log(`Name: ${u.name} \nEmail: ${u.email} \nLocal UID: ${u.uid} \nStatus: ${status}\n`);
    }

    console.log(`\nSummary: ${missingCount} out of ${abcUsers.length} users have missing or mismatched auth accounts in Supabase.`);

  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}
run();
