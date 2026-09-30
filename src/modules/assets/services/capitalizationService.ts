import { db } from '../../../shared/db/index.js';
import { assets, accounting_events, asset_depreciation_schedule } from '../../../shared/db/schema.js';
import { eq, and } from 'drizzle-orm';

export const capitalizationService = {
  async capitalize(assetId: string, putToUseDate: Date, reqUserUid: string) {
    return await db.transaction(async (tx: any) => {
      const assetResult = await tx.select().from(assets).where(eq(assets.id, assetId));
      if (!assetResult.length) throw new Error('Asset not found');
      
      const asset = assetResult[0];

      if (asset.isCapitalized) {
        return asset; // Idempotent return
      }

      if (asset.costStatus !== 'Final') {
        throw new Error('Asset cost must be finalized before capitalization');
      }

      // Update asset to capitalized
      await tx.update(assets).set({
        isCapitalized: true,
        putToUseDate: putToUseDate,
        capitalizationDate: new Date(),
        status: 'Active'
      }).where(eq(assets.id, assetId));

      // Emit accounting event
      await tx.insert(accounting_events).values({
        companyId: asset.companyId,
        eventType: 'Asset Capitalization',
        sourceType: 'Asset',
        sourceId: assetId,
        debitAccount: 'Fixed Assets', // In reality these would be IDs derived from company chart of accounts
        creditAccount: 'Capital Work In Progress',
        amount: asset.acquisitionCost,
        status: 'Pending'
      });

      // Simple Straight Line Depreciation Generation if applicable
      if (asset.depreciationMethod === 'Straight Line' && asset.usefulLifeMonths > 0) {
        const monthlyDepreciation = (Number(asset.acquisitionCost) - Number(asset.salvageValue)) / asset.usefulLifeMonths;
        
        let currentDate = new Date(putToUseDate);
        for (let i = 1; i <= asset.usefulLifeMonths; i++) {
           currentDate.setMonth(currentDate.getMonth() + 1);
           await tx.insert(asset_depreciation_schedule).values({
             companyId: asset.companyId,
             assetId,
             periodNumber: i,
             periodDate: new Date(currentDate),
             depreciationAmount: String(monthlyDepreciation.toFixed(2)),
             accumulatedDepreciation: String((monthlyDepreciation * i).toFixed(2)),
             bookValueAfter: String((Number(asset.acquisitionCost) - monthlyDepreciation * i).toFixed(2)),
             status: 'Scheduled'
           });
        }
      }

      return { success: true };
    });
  }
};
