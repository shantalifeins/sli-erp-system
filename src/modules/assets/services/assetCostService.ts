import { db } from '../../../shared/db/index.js';
import { assets, invoice_items, invoices, accounting_events } from '../../../shared/db/schema.js';
import { eq } from 'drizzle-orm';

export const assetCostService = {
  async finalize(invoiceItemId: number, reqUserUid: string) {
    return await db.transaction(async (tx: any) => {
      const invItemResult = await tx.select().from(invoice_items).where(eq(invoice_items.id, invoiceItemId));
      if (!invItemResult.length) throw new Error('Invoice line not found');
      const invItem = invItemResult[0];

      if (!invItem.capitalizable) {
        throw new Error('This invoice line is not marked for capitalization');
      }

      // Find draft assets linked to this PO/GRN line
      // Actually we link the invoice_item directly to assets
      const draftAssets = await tx.select().from(assets).where(
        eq(assets.invoiceItemId, invoiceItemId)
      );

      // If they are not linked directly, maybe by poItemId?
      // For now we'll assume the PO/GRN linkage exists on assets
      let assetsToCapitalize = draftAssets;
      if (assetsToCapitalize.length === 0 && invItem.poItemId) {
         assetsToCapitalize = await tx.select().from(assets).where(
           eq(assets.poItemId, invItem.poItemId)
         );
      }
      
      if (assetsToCapitalize.length === 0) {
        throw new Error('No draft assets found to capitalize for this invoice line');
      }

      const totalQty = Number(invItem.quantity);
      const totalLineCost = Number(invItem.unitPrice) * totalQty; // Assuming unitPrice is the final capitalized unit cost

      // Allocate cost
      const allocatedUnitCost = (totalLineCost / assetsToCapitalize.length).toFixed(2);

      for (const asset of assetsToCapitalize) {
        await tx.update(assets).set({
          costStatus: 'Final',
          acquisitionCost: allocatedUnitCost,
          currentBookValue: allocatedUnitCost,
          invoiceId: invItem.invoiceId,
          invoiceItemId: invItem.id
        }).where(eq(assets.id, asset.id));
      }

      return assetsToCapitalize.length;
    });
  }
};
