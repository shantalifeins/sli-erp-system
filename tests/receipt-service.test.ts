import { describe, it, expect, vi } from 'vitest';
import { stockService } from '../src/modules/inventory/services/stockService.js';
import { receiptService } from '../src/modules/inventory/services/receiptService.js';

describe('Receipt Service', () => {
  it('processes physical inventory item correctly', async () => {
    // Mock the db tx
    const mockTx = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockImplementation((condition: any) => {
        const queryStr = condition?.toString() || '';
        if (queryStr.includes('po_items.id')) {
          return [{ id: 1, itemId: 100, unitPrice: '50.00' }];
        }
        if (queryStr.includes('inventory_items.id')) {
          return [{ id: 100, assetNature: 'Physical', accountingTreatment: 'Inventory' }];
        }
        return [];
      })
    };
    
    const stockMoveInSpy = vi.spyOn(stockService, 'moveIn').mockResolvedValue(undefined);

    await receiptService.processGrnAddition(
      mockTx,
      'comp-1',
      10,
      500,
      'GRN-001',
      'user-1',
      [{ grnItemId: 1, poItemId: 1, passedQty: 5 }]
    );

    expect(stockMoveInSpy).toHaveBeenCalledWith(
      mockTx, 'comp-1', 10, 100, 5, '500', 'GRN', 'user-1', 50
    );
  });

  it('auto-creates draft assets for capitalized physical items', async () => {
     let insertedAssets: any[] = [];
     const mockTx = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockImplementation((condition: any) => {
        const queryStr = condition?.toString() || '';
        if (queryStr.includes('po_items.id')) {
          return [{ id: 1, itemId: 100, unitPrice: '50.00', poId: 55 }];
        }
        if (queryStr.includes('inventory_items.id')) {
          return [{ id: 100, assetNature: 'Physical', accountingTreatment: 'Capitalize', itemCode: 'LAP', name: 'Laptop', assetCategoryId: 'cat-1' }];
        }
        return [];
      }),
      insert: vi.fn().mockImplementation(() => ({
         values: (vals: any) => {
            insertedAssets.push(vals);
            return { onConflictDoNothing: vi.fn() };
         }
      }))
    };
    
    await receiptService.processGrnAddition(
      mockTx,
      'comp-1',
      10,
      500,
      'GRN-001',
      'user-1',
      [{ grnItemId: 1, poItemId: 1, passedQty: 2, serials: ['SN1', 'SN2'] }]
    );

    expect(insertedAssets.length).toBe(2);
    expect(insertedAssets[0].assetCode).toBe('LAP-SN1');
    expect(insertedAssets[1].assetCode).toBe('LAP-SN2');
    expect(insertedAssets[0].status).toBe('Draft');
  });
});
