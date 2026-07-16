import { db } from './src/shared/db/index';
import { users, roles, departments, companies } from './src/shared/db/schema';
import { eq, isNull } from 'drizzle-orm';

async function migrate() {
  try {
    console.log("Starting tenant migration...");
    
    // Get default company
    const allCompanies = await db.select().from(companies).limit(1);
    if (allCompanies.length === 0) {
      console.log("No companies exist. Skipping migration.");
      return;
    }
    const defaultCompanyId = allCompanies[0].id;
    console.log(`Using default company: ${allCompanies[0].name} (${defaultCompanyId})`);

    // Migrate users
    const updatedUsers = await db.update(users)
      .set({ companyId: defaultCompanyId })
      .where(isNull(users.companyId))
      .returning();
    console.log(`Migrated ${updatedUsers.length} users to default company.`);

    // Migrate roles
    const updatedRoles = await db.update(roles)
      .set({ companyId: defaultCompanyId })
      .where(isNull(roles.companyId))
      .returning();
    console.log(`Migrated ${updatedRoles.length} roles to default company.`);

    // Migrate departments
    const updatedDepts = await db.update(departments)
      .set({ companyId: defaultCompanyId })
      .where(isNull(departments.companyId))
      .returning();
    console.log(`Migrated ${updatedDepts.length} departments to default company.`);

    console.log("Tenant migration completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
