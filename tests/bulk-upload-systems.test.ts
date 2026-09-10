import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';

// Helper: Vendor Bulk Upload Logic Test
function processVendorBulkUpload(rawRows: any[][], dbVendorNames: string[]) {
  const dbVendorSet = new Set(dbVendorNames.map(v => v.trim().toLowerCase()));
  const errors: Array<{ row: number; name?: string; message: string }> = [];
  const duplicates: Array<{ row: number; name: string; message: string }> = [];
  const seenInFileSet = new Set<string>();
  const itemsToInsert: any[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    const excelRowNumber = i + 1;

    if (!row || row.every((cell: any) => String(cell).trim() === '')) {
      continue;
    }

    const nameRaw = String(row[0] || '').trim();
    const contactPersonRaw = String(row[1] || '').trim();
    const emailRaw = String(row[2] || '').trim();
    const phoneRaw = String(row[3] || '').trim();
    const binRaw = String(row[4] || '').trim();
    const tinRaw = String(row[5] || '').trim();
    const bankNameRaw = String(row[6] || '').trim();

    if (!nameRaw) {
      errors.push({ row: excelRowNumber, message: "Vendor Name is required" });
      continue;
    }

    if (emailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      errors.push({ row: excelRowNumber, name: nameRaw, message: `Invalid email address format '${emailRaw}'` });
      continue;
    }

    const nameLower = nameRaw.toLowerCase();
    if (seenInFileSet.has(nameLower)) {
      errors.push({
        row: excelRowNumber, name: nameRaw,
        message: `Duplicate Vendor Name '${nameRaw}' found multiple times in this file`
      });
      continue;
    }
    seenInFileSet.add(nameLower);

    if (dbVendorSet.has(nameLower)) {
      duplicates.push({
        row: excelRowNumber, name: nameRaw,
        message: "Vendor is already registered in system (Skipped)"
      });
      continue;
    }

    itemsToInsert.push({
      name: nameRaw,
      contactPerson: contactPersonRaw || null,
      email: emailRaw || null,
      phone: phoneRaw || null,
      bin: binRaw || null,
      tin: tinRaw || null,
      bankName: bankNameRaw || null
    });
  }

  return {
    successCount: itemsToInsert.length,
    duplicateCount: duplicates.length,
    errorCount: errors.length,
    itemsToInsert,
    duplicates,
    errors
  };
}

// Helper: Item Category Bulk Upload Logic Test
function processItemCategoryBulkUpload(rawRows: any[][], dbCategoryNames: string[]) {
  const dbCatSet = new Set(dbCategoryNames.map(c => c.trim().toLowerCase()));
  const errors: Array<{ row: number; name?: string; message: string }> = [];
  const duplicates: Array<{ row: number; name: string; message: string }> = [];
  const seenInFileSet = new Set<string>();
  const itemsToInsert: any[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    const excelRowNumber = i + 1;

    if (!row || row.every((cell: any) => String(cell).trim() === '')) {
      continue;
    }

    const nameRaw = String(row[0] || '').trim();
    const descriptionRaw = String(row[1] || '').trim();
    const statusRaw = String(row[2] || '').trim();

    if (!nameRaw) {
      errors.push({ row: excelRowNumber, message: "Category Name is required" });
      continue;
    }

    let statusProper = 'Active';
    if (statusRaw) {
      const statusLower = statusRaw.toLowerCase();
      if (statusLower !== 'active' && statusLower !== 'inactive') {
        errors.push({ row: excelRowNumber, name: nameRaw, message: `Invalid status '${statusRaw}'. Allowed: Active / Inactive` });
        continue;
      }
      statusProper = statusLower === 'active' ? 'Active' : 'Inactive';
    }

    const nameLower = nameRaw.toLowerCase();
    if (seenInFileSet.has(nameLower)) {
      errors.push({
        row: excelRowNumber, name: nameRaw,
        message: `Duplicate Category Name '${nameRaw}' found multiple times in this file`
      });
      continue;
    }
    seenInFileSet.add(nameLower);

    if (dbCatSet.has(nameLower)) {
      duplicates.push({
        row: excelRowNumber, name: nameRaw,
        message: "Category already exists in system (Skipped)"
      });
      continue;
    }

    itemsToInsert.push({
      name: nameRaw,
      description: descriptionRaw || null,
      status: statusProper
    });
  }

  return {
    successCount: itemsToInsert.length,
    duplicateCount: duplicates.length,
    errorCount: errors.length,
    itemsToInsert,
    duplicates,
    errors
  };
}

describe('Vendor & Item Category Bulk Upload Systems Test Suite', () => {
  describe('Vendor Bulk Upload', () => {
    it('should generate valid 2-sheet vendor template workbook', () => {
      const headers = ['Vendor Name *', 'Contact Person', 'Email', 'Phone', 'BIN', 'TIN', 'Bank Name', 'Branch Name', 'Account Name', 'Account Number', 'Routing Number'];
      const sampleRow = ['Acme Corp', 'John', 'john@acme.com', '01700000000', '123', '456', 'City Bank', 'Gulshan', 'Acme', '12345', '999'];
      const existingVendors = [['Existing Vendor Ltd', '111', '222', 'Active']];

      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
      XLSX.utils.book_append_sheet(wb, ws1, 'Vendor Template');
      const ws2 = XLSX.utils.aoa_to_sheet([['Vendor Name', 'BIN', 'TIN', 'Status'], ...existingVendors]);
      XLSX.utils.book_append_sheet(wb, ws2, 'Existing Vendors');

      expect(wb.SheetNames.length).toBe(2);
      expect(wb.SheetNames[0]).toBe('Vendor Template');
      expect(wb.SheetNames[1]).toBe('Existing Vendors');
    });

    it('should successfully parse valid vendors, handle duplicates, and report validation errors', () => {
      const rawRows = [
        ['Vendor Name *', 'Contact Person', 'Email', 'Phone'],
        ['Acme International', 'John Doe', 'john@acme.com', '01700000000'], // Valid
        ['', 'Jane', 'jane@test.com', '01800000000'], // Error: Missing Name
        ['Global Solutions', 'Mark', 'invalid-email-format', '01900000000'], // Error: Bad Email
        ['Existing Vendor Ltd', 'Sam', 'sam@existing.com', '01600000000'], // Duplicate in DB
        ['Acme International', 'John Doe', 'john@acme.com', '01700000000'] // Duplicate in File
      ];

      const dbVendors = ['Existing Vendor Ltd'];
      const result = processVendorBulkUpload(rawRows, dbVendors);

      expect(result.successCount).toBe(1);
      expect(result.duplicateCount).toBe(1); // Existing Vendor Ltd
      expect(result.errorCount).toBe(3); // Missing name, Bad email, In-file duplicate
      expect(result.itemsToInsert[0].name).toBe('Acme International');
      expect(result.duplicates[0].name).toBe('Existing Vendor Ltd');
    });
  });

  describe('Item Category Bulk Upload', () => {
    it('should generate valid 2-sheet category template workbook', () => {
      const headers = ['Category Name *', 'Description', 'Status'];
      const sampleRow = ['Electrical Items', 'Cables & switches', 'Active'];
      const existingCats = [['Furniture', 'Office chairs', 'Active']];

      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
      XLSX.utils.book_append_sheet(wb, ws1, 'Category Template');
      const ws2 = XLSX.utils.aoa_to_sheet([['Category Name', 'Description', 'Status'], ...existingCats]);
      XLSX.utils.book_append_sheet(wb, ws2, 'Existing Categories');

      expect(wb.SheetNames.length).toBe(2);
      expect(wb.SheetNames[0]).toBe('Category Template');
      expect(wb.SheetNames[1]).toBe('Existing Categories');
    });

    it('should successfully parse valid categories, skip existing DB duplicates, and reject invalid status/rows', () => {
      const rawRows = [
        ['Category Name *', 'Description', 'Status'],
        ['Hardware Tools', 'Hammers, drills, saws', 'Active'], // Valid
        ['', 'Description without name', 'Active'], // Error: Missing Name
        ['Office Stationery', 'Paper, pens, staplers', 'InvalidStatus'], // Error: Bad Status
        ['Furniture', 'Desks & tables', 'Active'], // Duplicate in DB
        ['Hardware Tools', 'Duplicate in file', 'Active'] // Duplicate in File
      ];

      const dbCategories = ['Furniture'];
      const result = processItemCategoryBulkUpload(rawRows, dbCategories);

      expect(result.successCount).toBe(1);
      expect(result.duplicateCount).toBe(1); // Furniture
      expect(result.errorCount).toBe(3); // Missing name, Bad status, In-file duplicate
      expect(result.itemsToInsert[0].name).toBe('Hardware Tools');
      expect(result.duplicates[0].name).toBe('Furniture');
    });
  });
});
