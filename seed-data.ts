import 'dotenv/config';
import { db } from './src/shared/db';
import * as schema from './src/shared/db/schema';
import { eq } from 'drizzle-orm';

async function seedData() {
  console.log('Seeding Database with Dummy Data...');

  // Get a user for PR creation
  const allUsers = await db.select().from(schema.users).limit(1);
  const uid = allUsers.length > 0 ? allUsers[0].uid : 'seed-uid-1234';

  // 1. Departments
  const departmentsData = [
    { code: 'HR001', name: 'Human Resources' },
    { code: 'IT001', name: 'Information Technology' },
    { code: 'FN001', name: 'Finance' },
    { code: 'MK001', name: 'Marketing' },
    { code: 'OP001', name: 'Operations' },
  ];
  for (const dept of departmentsData) {
    await db.insert(schema.departments).values(dept).onConflictDoNothing();
  }
  console.log('✅ Departments seeded');

  // 2. Designations
  const designationsData = [
    { name: 'Manager' },
    { name: 'Senior Developer' },
    { name: 'Accountant' },
    { name: 'HR Executive' },
    { name: 'Operations Lead' },
  ];
  for (const desig of designationsData) {
    await db.insert(schema.designations).values(desig).onConflictDoNothing();
  }
  console.log('✅ Designations seeded');

  // 3. Cost Centers
  const costCentersData = [
    { code: 'CC-01', name: 'HQ Operations' },
    { code: 'CC-02', name: 'Branch 1' },
    { code: 'CC-03', name: 'IT Infrastructure' },
    { code: 'CC-04', name: 'Marketing Campaign' },
    { code: 'CC-05', name: 'Logistics' },
  ];
  for (const cc of costCentersData) {
    await db.insert(schema.cost_centers).values(cc).onConflictDoNothing();
  }
  console.log('✅ Cost Centers seeded');

  // 4. Vendors
  const vendorsData = [
    { name: 'TechCorp Supplies', contactPerson: 'John Doe', email: 'contact@techcorp.com', phone: '01711000001' },
    { name: 'Global Logistics Inc', contactPerson: 'Jane Smith', email: 'jane@globallogistics.com', phone: '01711000002' },
    { name: 'Office Essentials Ltd', contactPerson: 'Mike Ross', email: 'mike@officeessentials.com', phone: '01711000003' },
    { name: 'Fast Print Services', contactPerson: 'Sarah Connor', email: 'sarah@fastprint.com', phone: '01711000004' },
    { name: 'Premium Furniture BD', contactPerson: 'Abdul Rahman', email: 'abdul@premiumfurniture.com', phone: '01711000005' },
  ];
  for (const v of vendorsData) {
    await db.insert(schema.vendors).values(v).onConflictDoNothing();
  }
  console.log('✅ Vendors seeded');

  // 5. Inventory Items
  const itemsData = [
    { itemCode: 'ITM-001', name: 'Dell XPS 15', category: 'IT Equipment', quantityInStock: 50, uom: 'PCs' },
    { itemCode: 'ITM-002', name: 'A4 Printer Paper', category: 'Consumable', quantityInStock: 200, uom: 'Ream' },
    { itemCode: 'ITM-003', name: 'Executive Chair', category: 'Fixed Asset', quantityInStock: 20, uom: 'PCs' },
    { itemCode: 'ITM-004', name: 'Whiteboard Markers', category: 'Consumable', quantityInStock: 150, uom: 'Box' },
    { itemCode: 'ITM-005', name: 'Network Switch 24-port', category: 'IT Equipment', quantityInStock: 10, uom: 'PCs' },
  ];
  for (const itm of itemsData) {
    await db.insert(schema.inventory_items).values(itm).onConflictDoNothing();
  }
  console.log('✅ Inventory Items seeded');

  // 6. Purchase Requisitions & PR Items
  const prsData = [
    { prNumber: 'PR-2023-0001', requestor: 'Alice', uid, department: 'Information Technology', priority: 'High', estimatedCost: '150000.00', status: 'Submitted' },
    { prNumber: 'PR-2023-0002', requestor: 'Bob', uid, department: 'Human Resources', priority: 'Normal', estimatedCost: '25000.00', status: 'Draft' },
    { prNumber: 'PR-2023-0003', requestor: 'Charlie', uid, department: 'Operations', priority: 'Urgent', estimatedCost: '5000.00', status: 'Approved' },
    { prNumber: 'PR-2023-0004', requestor: 'Dave', uid, department: 'Finance', priority: 'Normal', estimatedCost: '75000.00', status: 'Budget Verification' },
    { prNumber: 'PR-2023-0005', requestor: 'Eve', uid, department: 'Marketing', priority: 'Normal', estimatedCost: '10000.00', status: 'Submitted' },
  ];
  for (const pr of prsData) {
    const res = await db.insert(schema.purchase_requisitions).values(pr).onConflictDoNothing().returning({ id: schema.purchase_requisitions.id });
    if (res.length > 0) {
      const prId = res[0].id;
      // Add items to this PR
      await db.insert(schema.pr_items).values([
        { prId, itemName: 'Item 1 for ' + pr.prNumber, quantity: 2, uom: 'PCs', estimatedPrice: '1000' },
        { prId, itemName: 'Item 2 for ' + pr.prNumber, quantity: 5, uom: 'PCs', estimatedPrice: '500' },
      ]).onConflictDoNothing();
    }
  }
  console.log('✅ Purchase Requisitions seeded');

  console.log('Database Seeding Complete!');
  process.exit(0);
}

seedData().catch(console.error);
