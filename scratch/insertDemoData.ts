import * as dotenv from 'dotenv';
dotenv.config();

import { db } from '../src/shared/db/index.js';
import { companies, item_categories, inventory_items, vendors } from '../src/shared/db/schema.js';
import { ilike } from 'drizzle-orm';

async function run() {
  try {
    console.log("Looking for ABC company...");
    let companyRows = await db.select().from(companies).where(ilike(companies.name, '%abc%'));
    let companyId;

    if (companyRows.length === 0) {
      console.log("ABC Company not found. Creating one...");
      const newCompany = await db.insert(companies).values({
        name: 'ABC Company',
        slug: 'abc-company',
      }).returning();
      companyId = newCompany[0].id;
    } else {
      companyId = companyRows[0].id;
      console.log(`Found company: ${companyRows[0].name} (ID: ${companyId})`);
    }

    console.log("Inserting more demo Item Categories...");
    await db.insert(item_categories).values([
      { companyId, name: 'Furniture Demo', description: 'Office Furniture' },
      { companyId, name: 'Stationery Demo', description: 'General Stationery items' },
      { companyId, name: 'Networking Demo', description: 'Routers, Switches, Cables' },
      { companyId, name: 'Cleaning Supplies Demo', description: 'Janitorial supplies' },
      { companyId, name: 'Pantry Supplies Demo', description: 'Tea, Coffee, Sugar, etc.' }
    ]);

    console.log("Inserting more demo Inventory Items...");
    await db.insert(inventory_items).values([
      { companyId, itemCode: 'FUR-DEMO-01', name: 'Ergonomic Office Chair', category: 'Furniture Demo', uom: 'Pcs', quantityInStock: 25, isAdminItem: true, basePrice: "5500" },
      { companyId, itemCode: 'FUR-DEMO-02', name: 'Wooden Desk', category: 'Furniture Demo', uom: 'Pcs', quantityInStock: 15, isAdminItem: true, basePrice: "8000" },
      { companyId, itemCode: 'STA-DEMO-01', name: 'Ballpoint Pens (Blue)', category: 'Stationery Demo', uom: 'Box', quantityInStock: 100, isAdminItem: true, basePrice: "150" },
      { companyId, itemCode: 'STA-DEMO-02', name: 'Sticky Notes', category: 'Stationery Demo', uom: 'Pack', quantityInStock: 200, isAdminItem: true, basePrice: "50" },
      { companyId, itemCode: 'NET-DEMO-01', name: 'Cisco Switch 24-port', category: 'Networking Demo', uom: 'Pcs', quantityInStock: 5, isItItem: true, basePrice: "35000" },
      { companyId, itemCode: 'NET-DEMO-02', name: 'Cat6 Ethernet Cable Roll', category: 'Networking Demo', uom: 'Box', quantityInStock: 10, isItItem: true, basePrice: "2500" },
      { companyId, itemCode: 'CLN-DEMO-01', name: 'Floor Cleaner', category: 'Cleaning Supplies Demo', uom: 'Ltr', quantityInStock: 40, isAdminItem: true, basePrice: "200" },
      { companyId, itemCode: 'PAN-DEMO-01', name: 'Green Tea Bags', category: 'Pantry Supplies Demo', uom: 'Box', quantityInStock: 30, isAdminItem: true, basePrice: "250" },
      { companyId, itemCode: 'PAN-DEMO-02', name: 'Nescafe Coffee Jar', category: 'Pantry Supplies Demo', uom: 'Pcs', quantityInStock: 20, isAdminItem: true, basePrice: "450" },
      { companyId, itemCode: 'IT-DEMO-02', name: 'Wireless Mouse', category: 'IT Equipment Demo', uom: 'Pcs', quantityInStock: 60, isItItem: true, basePrice: "850" }
    ]);

    console.log("Inserting more demo Vendors...");
    await db.insert(vendors).values([
      { companyId, name: 'Global Furniture Co.', contactPerson: 'Michael Scott', phone: '01711223344', email: 'michael@globalfurniture.com' },
      { companyId, name: 'OfficeMate Supplies', contactPerson: 'Pam Beesly', phone: '01811223344', email: 'pam@officemate.com' },
      { companyId, name: 'TechNet Solutions', contactPerson: 'Jim Halpert', phone: '01911223344', email: 'jim@technet.com' },
      { companyId, name: 'CleanSweep Traders', contactPerson: 'Dwight Schrute', phone: '01511223344', email: 'dwight@cleansweep.com' },
      { companyId, name: 'Fresh Pantry Supplies', contactPerson: 'Stanley Hudson', phone: '01611223344', email: 'stanley@freshpantry.com' }
    ]);

    console.log("More demo data inserted successfully for ABC Company.");
  } catch (error) {
    console.error("Error inserting demo data:", error);
  }
  process.exit(0);
}

run();
