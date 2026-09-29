import { db } from '../../../shared/db/index.js';
import { 
  inventory_items, 
  grn_items, 
  assets, 
  digital_acceptances,
  po_items,
  grn_item_serials
} from '../../../shared/db/schema.js';
import { eq, inArray, and } from 'drizzle-orm';
import { stockService } from './stockService.js';

export const receiptService = {
  async processGrnAddition(
    tx: any,
    companyId: string,
    warehouseId: number,
    grnId: number,
    grnNumber: string,
    performedBy: string,
    passedItems: Array<{ grnItemId: number, poItemId: number, passedQty: number, serials?: string[] }>
  ) {
    if (passedItems.length === 0) return;

    // Fetch poItems to get item_id mapping and unitCost
    const poItemIds = passedItems.map(p => p.poItemId);
    const poItemsList = await tx.select().from(po_items).where(inArray(po_items.id, poItemIds));
    const poItemMap = new Map(poItemsList.map((pi: any) => [pi.id, pi]));

    // Fetch mapped inventory items
    const itemIds = poItemsList.map((pi: any) => pi.itemId).filter(Boolean);
    if (itemIds.length !== poItemsList.length) {
      throw new Error("One or more PO lines do not have a mapped item_id in the Item Master.");
    }
    const invItems = await tx.select().from(inventory_items).where(inArray(inventory_items.id, itemIds));
    const invMap = new Map(invItems.map((ii: any) => [ii.id, ii]));

    for (const { grnItemId, poItemId, passedQty, serials } of passedItems) {
      const poItem: any = poItemMap.get(poItemId);
      if (!poItem) continue;

      const itemDef: any = invMap.get(poItem.itemId);
      if (!itemDef) throw new Error(`Item Definition not found for itemId ${poItem.itemId}`);

      // 1. Digital Assets
      if (itemDef.assetNature === 'Digital' || itemDef.accountingTreatment === 'Prepaid') {
        await tx.insert(digital_acceptances).values({
          companyId,
          grnId,
          poItemId,
          acceptedByUid: performedBy,
          acceptedAt: new Date(),
          licenseType: itemDef.defaultLicenseType || 'Subscription',
          seats: passedQty,
          status: 'Pending' // Requires license key attachment later
        });
        continue;
      }

      // 2. Physical Fixed Assets (Capitalize)
      if (itemDef.assetNature === 'Physical' && itemDef.accountingTreatment === 'Capitalize') {
        // Create N Draft assets
        for (let i = 0; i < passedQty; i++) {
          const serial = serials?.[i] || `${grnNumber}-${grnItemId}-${i+1}`;
          
          await tx.insert(assets).values({
            companyId,
            assetCode: `${itemDef.itemCode}-${serial}`,
            name: itemDef.name,
            categoryId: itemDef.assetCategoryId,
            branchId: null,
            locationId: null,
            warehouseId,
            acquisitionDate: new Date(),
            value: String(poItem.unitPrice),
            status: 'Draft',
            poId: poItem.poId,
            poItemId,
            sourceGrnItemId: grnItemId,
            unitIndex: i,
            createdByUid: performedBy
          }).onConflictDoNothing({ target: [assets.sourceGrnItemId, assets.unitIndex] });
        }
        continue;
      }

      // 3. Normal Inventory/Expense
      await stockService.moveIn(
        tx,
        companyId,
        warehouseId,
        itemDef.id,
        passedQty,
        String(grnId),
        'GRN',
        performedBy,
        parseFloat(poItem.unitPrice)
      );
    }
  }
};
