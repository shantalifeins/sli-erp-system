import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';

// Helper function mirroring backend validation logic
function validateBulkUploadRows(rawRows: any[][], dbItemCodes: string[]) {
  const dbItemCodeSet = new Set(dbItemCodes.map(c => c.trim().toLowerCase()));
  const validUomSet = new Set(['pcs', 'kg', 'ltr', 'box', 'pack', 'mtr', 'set', 'unit', 'roll', 'pair']);
  const validItemTypeSet = new Set(['admin', 'it', 'both']);

  const errors: Array<{ row: number; itemCode?: string; name?: string; message: string }> = [];
  const duplicates: Array<{ row: number; itemCode: string; name: string; category: string; message: string }> = [];
  const seenInFileSet = new Set<string>();
  const itemsToInsert: any[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    const excelRowNumber = i + 1;

    if (!row || row.every((cell: any) => String(cell).trim() === '')) {
      continue;
    }

    const itemCodeRaw = String(row[0] || '').trim();
    const nameRaw = String(row[1] || '').trim();
    const categoryRaw = String(row[2] || '').trim();
    const uomRaw = String(row[3] || '').trim();
    const itemTypeRaw = String(row[4] || '').trim();
    const basePriceRaw = row[5];
    const locationRaw = String(row[6] || '').trim();
    const isFixedAssetRaw = String(row[7] || '').trim();

    if (!itemCodeRaw) {
      errors.push({ row: excelRowNumber, name: nameRaw, message: "Item Code is required" });
      continue;
    }
    if (!nameRaw) {
      errors.push({ row: excelRowNumber, itemCode: itemCodeRaw, message: "Item Name is required" });
      continue;
    }
    if (!categoryRaw) {
      errors.push({ row: excelRowNumber, itemCode: itemCodeRaw, name: nameRaw, message: "Category is required" });
      continue;
    }
    if (!uomRaw) {
      errors.push({ row: excelRowNumber, itemCode: itemCodeRaw, name: nameRaw, message: "UOM is required" });
      continue;
    }

    const uomLower = uomRaw.toLowerCase();
    if (!validUomSet.has(uomLower)) {
      errors.push({
        row: excelRowNumber,
        itemCode: itemCodeRaw,
        name: nameRaw,
        message: `Invalid UOM '${uomRaw}'. Allowed UOMs: Pcs, Kg, Ltr, Box, Pack, Mtr, Set, Unit, Roll, Pair`
      });
      continue;
    }

    let isAdminItem = true;
    let isItItem = false;
    if (itemTypeRaw) {
      const itemTypeLower = itemTypeRaw.toLowerCase();
      if (!validItemTypeSet.has(itemTypeLower)) {
        errors.push({
          row: excelRowNumber,
          itemCode: itemCodeRaw,
          name: nameRaw,
          message: `Invalid Item Type '${itemTypeRaw}'. Allowed: Admin, IT, Both`
        });
        continue;
      }
      isAdminItem = itemTypeLower === 'admin' || itemTypeLower === 'both';
      isItItem = itemTypeLower === 'it' || itemTypeLower === 'both';
    }

    let basePrice: string | null = null;
    if (basePriceRaw !== undefined && basePriceRaw !== null && String(basePriceRaw).trim() !== '') {
      const parsedPrice = Number(basePriceRaw);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        errors.push({
          row: excelRowNumber,
          itemCode: itemCodeRaw,
          name: nameRaw,
          message: `Base Price '${basePriceRaw}' must be a valid non-negative number`
        });
        continue;
      }
      basePrice = String(parsedPrice);
    }

    const codeLower = itemCodeRaw.toLowerCase();
    if (seenInFileSet.has(codeLower)) {
      errors.push({
        row: excelRowNumber,
        itemCode: itemCodeRaw,
        name: nameRaw,
        message: `Duplicate Item Code '${itemCodeRaw}' found multiple times in this file`
      });
      continue;
    }
    seenInFileSet.add(codeLower);

    if (dbItemCodeSet.has(codeLower)) {
      duplicates.push({
        row: excelRowNumber,
        itemCode: itemCodeRaw,
        name: nameRaw,
        category: categoryRaw,
        message: "Item Code already exists in system inventory (Skipped)"
      });
      continue;
    }

    const isFixedAssetLower = isFixedAssetRaw.toLowerCase();
    const isFixedAsset = isFixedAssetLower === 'yes' || isFixedAssetLower === 'true' || isFixedAssetLower === '1';

    itemsToInsert.push({
      itemCode: itemCodeRaw,
      name: nameRaw,
      category: categoryRaw,
      uom: uomRaw,
      basePrice,
      location: locationRaw || null,
      isFixedAsset,
      isAdminItem,
      isItItem
    });
  }

  return {
    imported: itemsToInsert.length,
    skippedDuplicates: duplicates.length,
    failed: errors.length,
    itemsToInsert,
    duplicates,
    errors
  };
}

describe('Inventory Bulk Upload — Logic & Excel Parsing Unit Tests', () => {
  it('should parse valid Excel template buffer and validate correct rows', () => {
    const wb = XLSX.utils.book_new();
    const headers = ['Item Code', 'Item Name', 'Category', 'UOM', 'Item Type', 'Base Price', 'Location', 'Is Fixed Asset'];
    const row1 = ['ITEM-101', 'Ergonomic Desk', 'Furniture', 'Pcs', 'Admin', '4500', 'Floor 2', 'No'];
    const row2 = ['ITEM-102', 'Monitor 27-inch', 'IT Supplies', 'Pcs', 'IT', '25000', 'IT Bay', 'Yes'];
    
    const ws = XLSX.utils.aoa_to_sheet([headers, row1, row2]);
    XLSX.utils.book_append_sheet(wb, ws, 'Items');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const parsedWb = XLSX.read(buffer, { type: 'buffer' });
    const rawRows: any[][] = XLSX.utils.sheet_to_json(parsedWb.Sheets[parsedWb.SheetNames[0]], { header: 1 });

    const result = validateBulkUploadRows(rawRows, []);

    expect(result.imported).toBe(2);
    expect(result.skippedDuplicates).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.itemsToInsert[0].itemCode).toBe('ITEM-101');
    expect(result.itemsToInsert[1].isFixedAsset).toBe(true);
    expect(result.itemsToInsert[1].isItItem).toBe(true);
  });

  it('should report database existing items as skipped duplicates with row numbers', () => {
    const rawRows = [
      ['Item Code', 'Item Name', 'Category', 'UOM', 'Item Type'],
      ['EXISTING-01', 'Old Item', 'Office', 'Pcs', 'Admin'],
      ['NEW-01', 'Fresh Item', 'Office', 'Pcs', 'Admin']
    ];

    const result = validateBulkUploadRows(rawRows, ['EXISTING-01']);

    expect(result.imported).toBe(1);
    expect(result.skippedDuplicates).toBe(1);
    expect(result.duplicates[0].row).toBe(2);
    expect(result.duplicates[0].itemCode).toBe('EXISTING-01');
    expect(result.itemsToInsert[0].itemCode).toBe('NEW-01');
  });

  it('should detect in-file duplicate item codes and flag as validation errors', () => {
    const rawRows = [
      ['Item Code', 'Item Name', 'Category', 'UOM'],
      ['DUP-CODE', 'First Occurrence', 'Tools', 'Pcs'],
      ['DUP-CODE', 'Second Occurrence', 'Tools', 'Pcs']
    ];

    const result = validateBulkUploadRows(rawRows, []);

    expect(result.imported).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors[0].row).toBe(3);
    expect(result.errors[0].message).toContain('Duplicate Item Code');
  });

  it('should reject missing required fields and invalid UOM or Item Type', () => {
    const rawRows = [
      ['Item Code', 'Item Name', 'Category', 'UOM', 'Item Type', 'Base Price'],
      ['', 'No Code', 'Cat', 'Pcs', 'Admin', '100'],
      ['ITEM-003', '', 'Cat', 'Pcs', 'Admin', '100'],
      ['ITEM-004', 'Bad UOM', 'Cat', 'Gallons', 'Admin', '100'],
      ['ITEM-005', 'Bad Price', 'Cat', 'Pcs', 'Admin', '-500']
    ];

    const result = validateBulkUploadRows(rawRows, []);

    expect(result.imported).toBe(0);
    expect(result.failed).toBe(4);
    expect(result.errors[0].row).toBe(2);
    expect(result.errors[0].message).toBe('Item Code is required');
    expect(result.errors[1].row).toBe(3);
    expect(result.errors[1].message).toBe('Item Name is required');
    expect(result.errors[2].row).toBe(4);
    expect(result.errors[2].message).toContain('Invalid UOM');
    expect(result.errors[3].row).toBe(5);
    expect(result.errors[3].message).toContain('must be a valid non-negative number');
  });
});
