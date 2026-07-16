import { db } from './src/db/index.js';
import { roles, role_permissions } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

const seedRolesData = [
  {
    name: 'Super Admin',
    description: 'Has full access to all modules and settings in the system.',
    permissions: [
      { module: 'Item Requisitions', canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
      { module: 'Purchase Orders', canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
      { module: 'Vendors', canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
      { module: 'Inventory', canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
      { module: 'Dashboard', canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
      { module: 'Admin', canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true }
    ]
  },
  {
    name: 'Requester',
    description: 'Can request items and view their own requisitions.',
    permissions: [
      { module: 'Dashboard', canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
      { module: 'Item Requisitions', canView: true, canCreate: true, canEdit: false, canDelete: false, canApprove: false }
    ]
  },
  {
    name: 'Department Head',
    description: 'Can approve requisitions for their department.',
    permissions: [
      { module: 'Dashboard', canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
      { module: 'Item Requisitions', canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: true }
    ]
  },
  {
    name: 'Procurement Manager',
    description: 'Manages all procurement activities including POs and Vendors.',
    permissions: [
      { module: 'Dashboard', canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
      { module: 'Item Requisitions', canView: true, canCreate: false, canEdit: true, canDelete: false, canApprove: true },
      { module: 'Purchase Orders', canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
      { module: 'Vendors', canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: false }
    ]
  },
  {
    name: 'Inventory Manager',
    description: 'Manages stock and inventory items.',
    permissions: [
      { module: 'Dashboard', canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
      { module: 'Inventory', canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: false }
    ]
  }
];

async function seed() {
  console.log("Seeding dynamic roles...");

  for (const roleData of seedRolesData) {
    // 1. Insert Role
    console.log(`Inserting role: ${roleData.name}`);
    const existingRole = await db.select().from(roles).where(eq(roles.name, roleData.name));
    if (existingRole.length === 0) {
      await db.insert(roles).values({ name: roleData.name, description: roleData.description });
    }

    // 2. Insert Permissions
    await db.delete(role_permissions).where(eq(role_permissions.role, roleData.name));
    
    const permsToInsert = roleData.permissions.map(p => ({
      role: roleData.name,
      module: p.module,
      canView: p.canView,
      canCreate: p.canCreate,
      canEdit: p.canEdit,
      canDelete: p.canDelete,
      canApprove: p.canApprove,
    }));

    await db.insert(role_permissions).values(permsToInsert);
    console.log(`- Permissions added for ${roleData.name}`);
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Error seeding roles:", err);
  process.exit(1);
});
