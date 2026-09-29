import { describe, it, expect } from 'vitest';
import { inventoryItemSchema } from '../src/modules/inventory/lib/itemSchema.js';

describe('Inventory Item Zod Schema', () => {
  it('validates a correct physical inventory item', () => {
    const item = {
      itemCode: 'PHY-01',
      name: 'Laptop',
      category: 'Electronics',
      uom: 'Pcs',
      assetNature: 'Physical',
      accountingTreatment: 'Inventory',
      receiptMode: 'Physical Receipt',
      usagePurpose: 'Internal Use'
    };
    const result = inventoryItemSchema.safeParse(item);
    expect(result.success).toBe(true);
  });

  it('rejects digital asset with physical receipt', () => {
    const item = {
      itemCode: 'DIG-01',
      name: 'Software',
      category: 'Software',
      uom: 'Lic',
      assetNature: 'Digital',
      accountingTreatment: 'Prepaid',
      receiptMode: 'Physical Receipt', // Invalid!
      defaultAmortizationMonths: 12
    };
    const result = inventoryItemSchema.safeParse(item);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Digital assets cannot use Physical Receipt');
    }
  });

  it('rejects capitalized physical item without asset category', () => {
    const item = {
      itemCode: 'CAP-01',
      name: 'Desk',
      category: 'Furniture',
      uom: 'Pcs',
      assetNature: 'Physical',
      accountingTreatment: 'Capitalize',
      // assetCategoryId is missing
    };
    const result = inventoryItemSchema.safeParse(item);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Capitalized items require an Asset Category');
    }
  });

  it('rejects resale item without inventory treatment', () => {
    const item = {
      itemCode: 'RES-01',
      name: 'Merchandise',
      category: 'Goods',
      uom: 'Pcs',
      usagePurpose: 'Resale',
      accountingTreatment: 'Expense' // Invalid!
    };
    const result = inventoryItemSchema.safeParse(item);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Items for Resale must have an Inventory accounting treatment');
    }
  });
});
