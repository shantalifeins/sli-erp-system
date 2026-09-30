import 'dotenv/config';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../src/shared/db/index.js';
import { matchingService } from '../src/modules/inventory/services/matchingService.js';
import { assetCostService } from '../src/modules/assets/services/assetCostService.js';
import { capitalizationService } from '../src/modules/assets/services/capitalizationService.js';
import { invoices, invoice_items, po_items, assets, inventory_items, asset_categories, companies, vendors, users, purchase_requisitions, purchase_orders, asset_depreciation_schedule } from '../src/shared/db/schema.js';
import { eq, ilike } from 'drizzle-orm';

describe('E2E Laptop Scenario - E1', () => {
  let abcCompanyId: string;

  beforeAll(async () => {
    const companyList = await db.select().from(companies).where(ilike(companies.name, '%abc%'));
    if (companyList.length > 0) {
      abcCompanyId = companyList[0].id;
    }
  });

  it('Should run E1 scenario for Laptop successfully', async () => {
    if (!abcCompanyId) return; // Skip if no DB setup
    
    // Create mock Vendor
    const v = await db.insert(vendors).values({ companyId: abcCompanyId, name: 'E2E Vendor', email: 'test@e2e.com' }).returning();
    const vendorId = v[0].id;

    // Create mock Asset Category
    const ac = await db.insert(asset_categories).values({ companyId: abcCompanyId, name: 'E2E Laptops', code: 'E2E-LAP-' + Date.now() }).returning();
    const catId = ac[0].id;

    const itm = await db.insert(inventory_items).values({ 
      companyId: abcCompanyId, 
      itemCode: 'LAP-E2E-' + Date.now(), 
      name: 'E2E Laptop', 
      category: 'Fixed Asset', 
      isFixedAsset: true,
      assetCategoryId: catId,
      uom: 'PCS'
    }).returning();
    const itemId = itm[0].id;

    // Grab a user
    const userList = await db.select().from(users).where(eq(users.companyId, abcCompanyId)).limit(1);
    const testUser = userList[0];

    // Mock PR
    const pr = await db.insert(purchase_requisitions).values({
      companyId: abcCompanyId,
      prNumber: 'PR-E2E-' + Date.now(),
      requestor: testUser.name || 'Test User',
      uid: testUser.uid,
      department: 'IT',
      estimatedCost: '3000'
    }).returning();

    // Mock PO
    const po = await db.insert(purchase_orders).values({
      companyId: abcCompanyId,
      poNumber: 'PO-E2E-' + Date.now(),
      prId: pr[0].id,
      vendorId: vendorId,
      totalAmount: '3000'
    }).returning();
    const poId = po[0].id;

    // Mock PO Item
    const poItm = await db.insert(po_items).values({
       poId: poId, // Fake PO ID
       itemId: itemId,
       itemName: 'E2E Laptop',
       quantity: 2,
       uom: 'PCS',
       unitPrice: '1500',
    }).returning();

    // Create Mock Invoice
    const inv = await db.insert(invoices).values({
      companyId: abcCompanyId,
      invoiceNumber: 'INV-E2E-' + Date.now(),
      poId: poId,
      vendorId: vendorId,
      amount: '3000',
      matchStatus: 'Pending',
      status: 'Pending'
    }).returning();
    const invId = inv[0].id;

    // Create Mock Invoice Item
    const invItem = await db.insert(invoice_items).values({
      invoiceId: invId,
      poItemId: poItm[0].id,
      itemId: itemId,
      quantity: '2',
      unitPrice: '1500',
      capitalizable: true
    }).returning();

    // Run 3-Way Match
    const matchRes = await matchingService.matchInvoice(invId, 'system');
    expect(matchRes).toBe('Matched');

    // Create Draft Assets (usually done by GRN QC, we simulate here)
    const asset1 = await db.insert(assets).values({
       companyId: abcCompanyId,
       assetCode: 'AST-E2E-1-' + Date.now(),
       name: 'E2E Laptop 1',
       categoryId: catId,
       poItemId: poItm[0].id,
       acquisitionDate: new Date(),
       acquisitionCost: '1500', // Provisional cost
       currentBookValue: '1500',
       status: 'Draft',
       sourceType: 'Manual',
       costStatus: 'Provisional'
    }).returning();
    
    const asset2 = await db.insert(assets).values({
       companyId: abcCompanyId,
       assetCode: 'AST-E2E-2-' + Date.now(),
       name: 'E2E Laptop 2',
       categoryId: catId,
       poItemId: poItm[0].id,
       acquisitionDate: new Date(),
       acquisitionCost: '1500', // Provisional cost
       currentBookValue: '1500',
       status: 'Draft',
       sourceType: 'Manual',
       costStatus: 'Provisional'
    }).returning();

    // Finalize Cost (Link invoice to assets)
    const finalized = await assetCostService.finalize(invItem[0].id, 'system');
    
    // Verify assets updated
    const updatedAssets = await db.select().from(assets).where(eq(assets.poItemId, poItm[0].id));
    expect(updatedAssets.length).toBe(2);
    expect(updatedAssets[0].costStatus).toBe('Final');
    expect(updatedAssets[0].invoiceItemId).toBe(invItem[0].id);

    // Capitalize one asset
    const capRes = await capitalizationService.capitalize(asset1[0].id, new Date(), 'system');
    
    const capAsset = await db.select().from(assets).where(eq(assets.id, asset1[0].id));
    expect(capAsset[0].isCapitalized).toBe(true);
    expect(capAsset[0].status).toBe('Active');

    // Cleanup E2E Data
    await db.delete(asset_depreciation_schedule).where(eq(asset_depreciation_schedule.assetId, asset1[0].id));
    await db.delete(assets).where(eq(assets.poItemId, poItm[0].id));
    await db.delete(invoice_items).where(eq(invoice_items.invoiceId, invId));
    await db.delete(invoices).where(eq(invoices.id, invId));
    await db.delete(po_items).where(eq(po_items.id, poItm[0].id));
    await db.delete(purchase_orders).where(eq(purchase_orders.id, poId));
    await db.delete(purchase_requisitions).where(eq(purchase_requisitions.id, pr[0].id));
    await db.delete(inventory_items).where(eq(inventory_items.id, itemId));
    await db.delete(asset_categories).where(eq(asset_categories.id, catId));
    await db.delete(vendors).where(eq(vendors.id, vendorId));
  }, 20000);
});
