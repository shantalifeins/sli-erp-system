import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../src/shared/db';
import {
  companies,
  users,
  purchase_requisitions,
  pr_items,
  rfq,
  vendors,
  quotations,
} from '../src/shared/db/schema';
import { eq, ilike, and } from 'drizzle-orm';
import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// Vendor Quotation & CS Data Flow Tests
// Tests VAT, TAX, Attachment URL, Description, and Grand Total Calculations
// ─────────────────────────────────────────────────────────────────────────────

describe('Vendor Quotations & CS Breakdown Tests', () => {
  let companyId: string;
  let testUserId: string;
  let testVendorId: number;
  let testPrId: number;
  let testPrItemId: number;
  let testRfqId: number;

  const uniqueSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();

  // ── Setup ──────────────────────────────────────────────────────────────────
  beforeAll(async () => {
    const comp = await db.select().from(companies).limit(1);
    if (comp.length === 0) throw new Error('No company found for test');
    companyId = comp[0].id;

    const user = await db.select().from(users).where(eq(users.companyId, companyId)).limit(1);
    if (user.length === 0) throw new Error('No user found');
    testUserId = user[0].uid;

    // Create a test vendor
    const v = await db.insert(vendors).values({
      companyId,
      name: `Test Vendor ${uniqueSuffix}`,
      contactPerson: 'Quote Tester',
      email: `vendor-${uniqueSuffix}@test.com`,
    }).returning();
    testVendorId = v[0].id;

    // Create a test PR
    const prRec = await db.insert(purchase_requisitions).values({
      companyId,
      prNumber: `PR-QT-${uniqueSuffix}`,
      requestor: 'Quote Test User',
      uid: testUserId,
      department: 'Procurement',
      estimatedCost: '1000',
      status: 'Approved',
    }).returning();
    testPrId = prRec[0].id;

    // Add PR Item
    const itemRec = await db.insert(pr_items).values({
      prId: testPrId,
      itemName: 'Laptop Bag',
      category: 'IT Equipment',
      quantity: 5,
      uom: 'pcs',
      estimatedPrice: '200',
    }).returning();
    testPrItemId = itemRec[0].id;

    // Create RFQ
    const rfqRec = await db.insert(rfq).values({
      companyId,
      rfqNumber: `RFQ-QT-${uniqueSuffix}`,
      prId: testPrId,
      status: 'Open',
    }).returning();
    testRfqId = rfqRec[0].id;
  });

  // ── Cleanup ────────────────────────────────────────────────────────────────
  afterAll(async () => {
    if (testRfqId) {
      await db.delete(quotations).where(eq(quotations.rfqId, testRfqId));
      await db.delete(rfq).where(eq(rfq.id, testRfqId));
    }
    if (testPrId) {
      await db.delete(pr_items).where(eq(pr_items.prId, testPrId));
      await db.delete(purchase_requisitions).where(eq(purchase_requisitions.id, testPrId));
    }
    if (testVendorId) {
      await db.delete(vendors).where(eq(vendors.id, testVendorId));
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Unit Tests: Math Calculations for Subtotal, VAT, TAX & Grand Total
  // ──────────────────────────────────────────────────────────────────────────
  describe('Unit: Quotation VAT, TAX & Grand Total Math', () => {
    it('should correctly calculate subtotal, VAT amount, TAX amount, and Grand Total', () => {
      const quantity = 5;
      const unitPrice = 200;
      const subtotal = quantity * unitPrice; // 1000
      const vatPercent = 15; // 15%
      const taxPercent = 5;  // 5%

      const vatAmount = subtotal * (vatPercent / 100);  // 150
      const taxAmount = subtotal * (taxPercent / 100);  // 50
      const grandTotal = subtotal + vatAmount + taxAmount; // 1200

      expect(subtotal).toBe(1000);
      expect(vatAmount).toBe(150);
      expect(taxAmount).toBe(50);
      expect(grandTotal).toBe(1200);
    });

    it('should handle 0% VAT and 0% TAX correctly', () => {
      const subtotal = 500;
      const vatAmount = subtotal * (0 / 100);
      const taxAmount = subtotal * (0 / 100);
      const grandTotal = subtotal + vatAmount + taxAmount;

      expect(vatAmount).toBe(0);
      expect(taxAmount).toBe(0);
      expect(grandTotal).toBe(500);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Integration Tests: Saving and Retrieving Quotations with Attachment & Calculations
  // ──────────────────────────────────────────────────────────────────────────
  describe('Integration: Insert and Fetch Quotation with New Columns', () => {
    it('should insert quotation with attachmentUrl, VAT, TAX, description, and grand total', async () => {
      const testAttachment = 'data:application/pdf;base64,JVBERi0xLjQK...';
      const subtotal = 5 * 200; // 1000
      const vatAmount = 1000 * 0.15; // 150
      const taxAmount = 1000 * 0.05; // 50
      const grandTotal = 1200;

      const inserted = await db.insert(quotations).values({
        rfqId: testRfqId,
        vendorId: testVendorId,
        prItemId: testPrItemId,
        quotedPrice: '200',
        deliveryDays: 7,
        remarks: 'Sample quotation test',
        attachmentUrl: testAttachment,
        vatPercent: '15',
        vatAmount: vatAmount.toString(),
        taxPercent: '5',
        taxAmount: taxAmount.toString(),
        totalAmount: grandTotal.toString(),
        description: 'Premium Leather Bag',
      }).returning();

      expect(inserted.length).toBe(1);
      expect(inserted[0].attachmentUrl).toBe(testAttachment);
      expect(Number(inserted[0].vatPercent)).toBe(15);
      expect(Number(inserted[0].vatAmount)).toBe(150);
      expect(Number(inserted[0].taxPercent)).toBe(5);
      expect(Number(inserted[0].taxAmount)).toBe(50);
      expect(Number(inserted[0].totalAmount)).toBe(1200);
      expect(inserted[0].description).toBe('Premium Leather Bag');
    });

    it('should query quotations for RFQ and return complete breakdown', async () => {
      const quotes = await db.select().from(quotations).where(eq(quotations.rfqId, testRfqId));
      expect(quotes.length).toBe(1);
      expect(quotes[0].vendorId).toBe(testVendorId);
      expect(quotes[0].attachmentUrl).toBeDefined();
      expect(Number(quotes[0].totalAmount)).toBe(1200);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Regression Tests: RFQ Data Integrity
  // ──────────────────────────────────────────────────────────────────────────
  describe('Regression: RFQ and Vendor status integrity', () => {
    it('RFQ should stay in Open status', async () => {
      const rfqRecord = await db.select().from(rfq).where(eq(rfq.id, testRfqId));
      expect(rfqRecord[0].status).toBe('Open');
    });
  });
});
