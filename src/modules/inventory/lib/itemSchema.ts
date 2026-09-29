import { z } from 'zod';

export const inventoryItemSchema = z.object({
  itemCode: z.string().min(1, 'Item Code is required'),
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category string is required'), // legacy support
  itemCategoryId: z.number().optional().nullable(),
  uom: z.string().min(1, 'UOM is required'),
  description: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  status: z.enum(['Active', 'Inactive', 'Obsolete']).default('Active'),
  
  // Classification
  assetNature: z.enum(['Physical', 'Digital']).default('Physical'),
  usagePurpose: z.enum(['Internal Use', 'Resale', 'Consumption']).default('Internal Use'),
  accountingTreatment: z.enum(['Inventory', 'Capitalize', 'Expense', 'Prepaid']).default('Inventory'),
  
  isAdminItem: z.boolean().default(false),
  isItItem: z.boolean().default(false),
  isFixedAsset: z.boolean().default(false), // legacy support
  isDigitalAsset: z.boolean().default(false), // legacy support

  // Tracking & Receipt
  trackingRequired: z.boolean().default(false),
  trackingMethod: z.enum(['None', 'Batch/Lot', 'Individual Unit', 'License']).default('None'),
  receiptMode: z.enum(['Physical Receipt', 'Digital Acceptance']).default('Physical Receipt'),
  requiresQc: z.boolean().default(false),
  
  // Accounting Defaults (Physical/Capitalize)
  assetCategoryId: z.string().uuid().optional().nullable(),
  usefulLifeMonths: z.number().int().positive().optional().nullable(),
  depreciationMethod: z.string().optional().nullable(),
  salvagePercent: z.number().min(0).max(100).optional().nullable(),
  capitalizationThreshold: z.number().min(0).optional().nullable(),
  defaultCostCenterId: z.number().optional().nullable(),
  
  // Digital Defaults
  digitalAssetType: z.string().optional().nullable(),
  defaultLicenseType: z.string().optional().nullable(),
  defaultBillingCycle: z.string().optional().nullable(),
  defaultAmortizationMonths: z.number().int().positive().optional().nullable(),
  
  // Inventory Planning
  reorderLevel: z.number().min(0).default(0),
  reorderPoint: z.number().min(0).default(0),
  reorderQuantity: z.number().min(0).default(0),
  leadTimeDays: z.number().min(0).default(7),
  safetyStockDays: z.number().min(0).default(3),
  abcClassification: z.enum(['A', 'B', 'C']).optional().nullable(),
  location: z.string().optional().nullable(),
  basePrice: z.number().min(0).optional().nullable()
})
.refine(data => !(data.assetNature === 'Digital' && data.receiptMode === 'Physical Receipt'), {
  message: "Digital assets cannot use Physical Receipt mode.",
  path: ['receiptMode']
})
.refine(data => {
  if (data.accountingTreatment === 'Capitalize') {
    if (data.assetNature === 'Physical' && !data.assetCategoryId) return false;
    if (data.assetNature === 'Digital' && !data.digitalAssetType) return false;
  }
  return true;
}, {
  message: "Capitalized items require an Asset Category (if Physical) or Digital Asset Type (if Digital).",
  path: ['accountingTreatment']
})
.refine(data => !(data.usagePurpose === 'Resale' && data.accountingTreatment !== 'Inventory'), {
  message: "Items for Resale must have an Inventory accounting treatment.",
  path: ['accountingTreatment']
})
.refine(data => !(data.accountingTreatment === 'Prepaid' && !data.defaultAmortizationMonths), {
  message: "Prepaid items require default amortization months.",
  path: ['defaultAmortizationMonths']
});

export type InventoryItemPayload = z.infer<typeof inventoryItemSchema>;
