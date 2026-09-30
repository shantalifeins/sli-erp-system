import { describe, it, expect, vi, beforeEach } from 'vitest';
import { matchingService } from '../src/modules/inventory/services/matchingService.js';
import { db } from '../src/shared/db/index.js';

import { invoices, invoice_items, po_items } from '../src/shared/db/schema.js';

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
          const q = condition?.toString() || '';
          
          if (t === invoices) return [{ id: 1 }];
          
          if (t === invoice_items) {
            return [
              { id: 10, poItemId: 100, grnItemId: null, quantity: '10', unitPrice: '100' },
              { id: 11, poItemId: 101, grnItemId: null, quantity: '5', unitPrice: '50' }
            ];
          }
          
          if (t === po_items) {
             if (q.includes('100')) return [{ id: 100, quantity: '10', unitPrice: '99' }]; 
             if (q.includes('101')) return [{ id: 101, quantity: '5', unitPrice: '40' }]; 
             return [];
          }
          return [];
        }),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        execute: vi.fn()
      };
      return await cb(mockTx);
    })
  }
}));

describe('Matching Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tolerates price diff within 3% but fails if outside', async () => {
    const status = await matchingService.matchInvoice(1, 'user1');
    expect(status).toBe('Mismatched');
    // Line 11 is 25% off (50 vs 40)
  });
});
