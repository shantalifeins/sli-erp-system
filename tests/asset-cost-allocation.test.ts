import { describe, it, expect, vi } from 'vitest';
import { assetCostService } from '../src/modules/assets/services/assetCostService.js';
import { db } from '../src/shared/db/index.js';

import { invoice_items, assets } from '../src/shared/db/schema.js';

vi.mock('../src/shared/db/index.js', () => ({
  db: {
    transaction: vi.fn(async (cb) => {
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockImplementation(function(this: any, table: any) {
          this._table = table;
          return this;
        }),
        where: vi.fn().mockImplementation(function(this: any, condition: any) {
          const t = this._table;
          if (t === invoice_items) {
            return [{ id: 10, poItemId: 100, quantity: '3', unitPrice: '1000', capitalizable: true, invoiceId: 1 }];
          }
          if (t === assets) {
            return [
              { id: 'a1', poItemId: 100 },
              { id: 'a2', poItemId: 100 },
              { id: 'a3', poItemId: 100 }
            ];
          }
          return [];
        }),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockImplementation((vals) => {
           mockTx._lastSet = vals;
           return mockTx;
        }),
        _lastSet: null
      };
      await cb(mockTx);
      return mockTx._lastSet;
    })
  }
}));

describe('Asset Cost Allocation', () => {
  it('allocates total cost evenly to draft assets', async () => {
    // 3 items at 1000 unit price -> total line cost 3000
    // 3 draft assets -> each gets 1000
    const finalSet = await assetCostService.finalize(10, 'user1');
    expect(finalSet).toEqual({
      costStatus: 'Final',
      acquisitionCost: '1000.00',
      currentBookValue: '1000.00',
      invoiceId: 1,
      invoiceItemId: 10
    });
  });
});
