const { db } = require('../dist/shared/db/index.js');
const { users, companies } = require('../dist/shared/db/schema.js');
const { eq, ilike } = require('drizzle-orm');

async function fixLiveUsers() {
  try {
    console.log("Starting user migration script...");

    // 1. Find the Shanta Life Insurance company
    const targetCompany = await db.select().from(companies).where(ilike(companies.name, '%Shanta Life Insurance%')).limit(1);
    
    if (targetCompany.length === 0) {
      console.log("❌ Target company (Shanta Life Insurance PLC) not found in the database.");
      process.exit(1);
    }
    const shantaCompanyId = targetCompany[0].id;
    console.log(`✅ Found Target Company: ${targetCompany[0].name} (${shantaCompanyId})`);

    // 2. Find the fallback company (usually the first one created, likely a demo or default company)
    // Here we assume it is the first company returned if sorted by creation date, or we can just fetch all companies
    const allCompanies = await db.select().from(companies);
    const fallbackCompanyId = allCompanies[0].id; // This matches the `limit(1)` logic from the bug
    
    if (fallbackCompanyId === shantaCompanyId) {
      console.log("✅ Shanta Life Insurance is the primary fallback company. No users were lost to another tenant.");
      process.exit(0);
    }

    console.log(`⚠️ Fallback Company identified as: ${allCompanies[0].name} (${fallbackCompanyId})`);

    // 3. Find users in the fallback company that shouldn't be there.
    // Assuming Super Admins or real employees got created there by mistake.
    const strandedUsers = await db.select().from(users).where(eq(users.companyId, fallbackCompanyId));
    
    if (strandedUsers.length === 0) {
      console.log("✅ No stranded users found in the fallback company.");
    } else {
      console.log(`Found ${strandedUsers.length} users in the fallback company. Moving them to Shanta Life Insurance...`);
      
      const strandedUserIds = strandedUsers.map(u => u.id);
      
      // Update their company ID to Shanta Life Insurance
      for (const user of strandedUsers) {
        await db.update(users).set({ companyId: shantaCompanyId }).where(eq(users.id, user.id));
        console.log(`   -> Moved user: ${user.name} (${user.email})`);
      }
      
      console.log("🎉 Successfully migrated users to the correct company.");
    }

    process.exit(0);
  } catch (err) {
    console.error("Error migrating users:", err);
    process.exit(1);
  }
}

fixLiveUsers();
