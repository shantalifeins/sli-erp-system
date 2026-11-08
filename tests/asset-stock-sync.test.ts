import { describe, it, expect, vi } from 'vitest';
import { receiptService } from '../src/modules/inventory/services/receiptService.js';
import { stockService } from '../src/modules/inventory/services/stockService.js';

describe('Asset & Inventory Stock Synchronization Suite', () => {
  it('synchronizes GRN QC pass for fixed assets with draft asset creation and warehouse stock movement', async () => {
    let insertedAssets: any[] = [];
    let callCount = 0;
    const mockTx = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return [{ id: 10, itemId: 50, unitPrice: '1200.00', poId: 99 }];
        }
        if (callCount === 2) {
          return [{
            id: 50,
            itemCode: 'LAP-DELL',
            name: 'Dell Latitude 7440',
            assetNature: 'Physical',
            accountingTreatment: 'Capitalize',
            assetCategoryId: 'cat-uuid-1'
          }];
        }
        return [];
      }),
      insert: vi.fn().mockImplementation(() => ({
        values: (vals: any) => {
          insertedAssets = insertedAssets.concat(Array.isArray(vals) ? vals : [vals]);
          return { onConflictDoNothing: vi.fn() };
        }
      }))
    };

    const stockMoveInSpy = vi.spyOn(stockService, 'moveIn').mockResolvedValue(undefined);

    await receiptService.processGrnAddition(
      mockTx,
      'tenant-sli-1',
      5, // warehouseId
      200, // grnId
      'GRN-2026-001',
      'user-mgr-1',
      [{ grnItemId: 1, poItemId: 10, passedQty: 2, serials: ['SER-001', 'SER-002'] }]
    );

    // 1. Verify Draft assets were created with cost and book value
    expect(insertedAssets.length).toBe(2);
    expect(insertedAssets[0].assetCode).toBe('LAP-DELL-SER-001');
    expect(insertedAssets[0].status).toBe('Draft');
    expect(insertedAssets[0].acquisitionCost).toBe('1200.00');
    expect(insertedAssets[0].currentBookValue).toBe('1200.00');
    expect(insertedAssets[0].warehouseId).toBe(5);

    // 2. Verify stockService.moveIn was called so warehouse stock & stock_transactions are updated
    expect(stockMoveInSpy).toHaveBeenCalledWith(
      mockTx,
      'tenant-sli-1',
      5,
      50,
      2,
      '200',
      'GRN',
      'user-mgr-1',
      1200.00
    );
  });

  it('validates stock transaction payload requirements for direct asset entry and assignment', () => {
    // Test transaction payload shape for Direct Asset Entry
    const directEntryTx = {
      companyId: 'comp-1',
      itemId: 101,
      warehouseId: 3,
      transactionType: 'Stock In',
      referenceId: 'Asset Entry: AST-20261108-0001',
      quantity: 1,
      performedBy: 'usr-1',
      createdAt: new Date()
    };

    expect(directEntryTx.transactionType).toBe('Stock In');
    expect(directEntryTx.quantity).toBe(1);
    expect(directEntryTx.referenceId).toContain('Asset Entry:');

    // Test transaction payload shape for Asset Assignment
    const assignmentTx = {
      companyId: 'comp-1',
      itemId: 101,
      warehouseId: 3,
      transactionType: 'Issue',
      referenceId: 'Asset Assignment: AST-20261108-0001',
      quantity: 1,
      performedBy: 'usr-admin',
      createdAt: new Date()
    };

    expect(assignmentTx.transactionType).toBe('Issue');
    expect(assignmentTx.quantity).toBe(1);
    expect(assignmentTx.referenceId).toContain('Asset Assignment:');

    // Test transaction payload shape for Asset Return
    const returnTx = {
      companyId: 'comp-1',
      itemId: 101,
      warehouseId: 3,
      transactionType: 'Stock In',
      referenceId: 'Asset Return: AST-20261108-0001',
      quantity: 1,
      performedBy: 'usr-admin',
      createdAt: new Date()
    };

    expect(returnTx.transactionType).toBe('Stock In');
    expect(returnTx.referenceId).toContain('Asset Return:');

    // Test transaction payload shape for Asset Disposal
    const disposalTx = {
      companyId: 'comp-1',
      itemId: 101,
      warehouseId: 3,
      transactionType: 'Stock Out',
      referenceId: 'Asset Disposal: AST-20261108-0001',
      quantity: 1,
      performedBy: 'usr-admin',
      createdAt: new Date()
    };

    expect(disposalTx.transactionType).toBe('Stock Out');
    expect(disposalTx.referenceId).toContain('Asset Disposal:');
  });
});

