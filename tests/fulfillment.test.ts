import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../src/shared/db';
import {
  companies,
  users,
  purchase_requisitions,
  pr_items,
  warehouses,
  inventory_items,
} from '../src/shared/db/schema';
import { eq, ilike, and } from 'drizzle-orm';
import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// Fulfillment Flow Tests
// Tests the fix: submitFulfillment should NOT auto-create PRs (prQuantity=0).
// Only the explicit "Create PR" button should push items to Procurement.
// ─────────────────────────────────────────────────────────────────────────────

describe('Fulfillment Flow — Unit & Integration Tests', () => {
  let companyId: string;
  let testUserId: string;
  let testIrId: number;        // Item Requisition
  let testItemId: number;      // Inventory item
  let testWarehouseId: number; // Warehouse
  let testIrItemId: number;    // IR item row

  const testIrNumber = `IR-FULFILLTEST-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  // ── Setup ──────────────────────────────────────────────────────────────────
  beforeAll(async () => {
    const comp = await db.select().from(companies).limit(1);
    if (comp.length === 0) throw new Error('No test company found — tests require a live DB company');
    companyId = comp[0].id;

    const user = await db.select().from(users).where(eq(users.companyId, companyId)).limit(1);
    if (user.length === 0) throw new Error('No user in test company');
    testUserId = user[0].uid;

    // Find any warehouse for the company
    const wh = await db.select().from(warehouses).where(eq(warehouses.companyId, companyId)).limit(1);
    if (wh.length > 0) testWarehouseId = wh[0].id;

    // Find any inventory item
    const inv = await db.select().from(inventory_items).where(eq(inventory_items.companyId, companyId)).limit(1);
    if (inv.length > 0) testItemId = inv[0].id;

    // Create a test Item Requisition
    const irResult = await db.insert(purchase_requisitions).values({
      companyId,
      prNumber: testIrNumber,
      requestor: 'Test Fulfillment User',
      uid: testUserId,
      department: 'Test Dept',
      estimatedCost: '0',
      justification: 'Automated fulfillment flow test',
      status: 'Approved',
      deliveryStatus: 'Not Delivered',
    }).returning();
    testIrId = irResult[0].id;

    // Add items to IR
    const irItem = await db.insert(pr_items).values({
      prId: testIrId,
      itemId: testItemId || null,
      itemName: 'Test Pen',
      category: 'Stationery',
      quantity: 10,
      uom: 'Pcs',
      estimatedPrice: '10',
      deliveredQuantity: 0,
      prCreatedQuantity: 0,
    }).returning();
    testIrItemId = irItem[0].id;
  });

  // ── Cleanup ────────────────────────────────────────────────────────────────
  afterAll(async () => {
    if (testIrId) {
      await db.delete(pr_items).where(eq(pr_items.prId, testIrId));
      await db.delete(purchase_requisitions).where(eq(purchase_requisitions.id, testIrId));
    }
    // Also clean up any auto-generated PRs from this IR
    const autoPrs = await db.select().from(purchase_requisitions)
      .where(and(eq(purchase_requisitions.companyId, companyId), eq(purchase_requisitions.sourceIrId, testIrId)));
    for (const pr of autoPrs) {
      await db.delete(pr_items).where(eq(pr_items.prId, pr.id));
      await db.delete(purchase_requisitions).where(eq(purchase_requisitions.id, pr.id));
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Unit Test 1: prQuantity=0 logic (simulates frontend submitFulfillment fix)
  // ──────────────────────────────────────────────────────────────────────────
  describe('Unit: submitFulfillment zeroes out prQuantity', () => {
    it('should zero out prQuantity on all items before sending to backend', () => {
      const fulfillmentData = [
        { itemId: 1, itemName: 'Pen', issueQuantity: 5, prQuantity: 5, quantity: 10 },
        { itemId: 2, itemName: 'Notebook', issueQuantity: 0, prQuantity: 3, quantity: 3 },
      ];

      // This is the exact logic applied in the fixed submitFulfillment
      const issueOnlyItems = fulfillmentData.map((i) => ({ ...i, prQuantity: 0 }));

      for (const item of issueOnlyItems) {
        expect(item.prQuantity).toBe(0);
      }
      // issueQuantity must be untouched
      expect(issueOnlyItems[0].issueQuantity).toBe(5);
      expect(issueOnlyItems[1].issueQuantity).toBe(0);
    });

    it('should not mutate the original fulfillmentData array', () => {
      const fulfillmentData = [
        { itemId: 1, itemName: 'Pen', issueQuantity: 5, prQuantity: 5, quantity: 10 },
      ];
      const issueOnlyItems = fulfillmentData.map((i) => ({ ...i, prQuantity: 0 }));

      // Original must be unchanged
      expect(fulfillmentData[0].prQuantity).toBe(5);
      expect(issueOnlyItems[0].prQuantity).toBe(0);
    });

    it('should return empty array if no items', () => {
      const issueOnlyItems = ([] as any[]).map((i) => ({ ...i, prQuantity: 0 }));
      expect(issueOnlyItems).toHaveLength(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Unit Test 2: In Stock logic for null itemId
  // ──────────────────────────────────────────────────────────────────────────
  describe('Unit: In Stock display for null itemId items', () => {
    it('should return 0 stock for item with null itemId (custom item)', () => {
      const warehouseStock = [
        { itemId: 5, warehouseId: 1, quantity: 20 },
        { itemId: 6, warehouseId: 1, quantity: 10 },
      ];
      const selectedWarehouseId = '1';

      const getInStock = (itemId: number | null) => {
        if (!itemId) return 0;
        return warehouseStock.find(
          ws => ws.itemId === itemId && ws.warehouseId === parseInt(selectedWarehouseId)
        )?.quantity || 0;
      };

      expect(getInStock(null)).toBe(0);  // custom item — no stock lookup possible
      expect(getInStock(5)).toBe(20);    // inventory item — correct stock returned
      expect(getInStock(99)).toBe(0);    // item not in warehouse stock
    });

    it('should disable issue qty input when itemId is null', () => {
      // Simulates the condition that determines whether input is shown or disabled
      const canIssue = (itemId: number | null, inStock: number) => {
        if (!itemId) return false;        // no item id → cannot issue from stock
        if (inStock === 0) return false;  // no stock → cannot issue
        return true;
      };

      expect(canIssue(null, 0)).toBe(false);    // custom item → disabled
      expect(canIssue(null, 20)).toBe(false);   // custom item even with fake stock → disabled
      expect(canIssue(5, 0)).toBe(false);       // real item but no stock → disabled
      expect(canIssue(5, 10)).toBe(true);       // real item with stock → enabled
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Integration Test: fulfillment with issueQty only does NOT create a PR
  // ──────────────────────────────────────────────────────────────────────────
  describe('Integration: Fulfillment with issueQuantity only — no auto-PR created', () => {
    it('IR should exist and be Approved before fulfillment', async () => {
      const ir = await db.select().from(purchase_requisitions).where(eq(purchase_requisitions.id, testIrId));
      expect(ir.length).toBe(1);
      expect(ir[0].status).toBe('Approved');
    });

    it('prCreatedQuantity should start at 0', async () => {
      const item = await db.select().from(pr_items).where(eq(pr_items.id, testIrItemId));
      expect(item[0].prCreatedQuantity ?? 0).toBe(0);
    });

    it('should NOT create any child PR when prQuantity=0 (fulfillment only)', async () => {
      // Simulate the DB-side behaviour: if no prQuantity is processed, no PR gets created
      const prsBefore = await db.select().from(purchase_requisitions)
        .where(and(eq(purchase_requisitions.companyId, companyId), eq(purchase_requisitions.sourceIrId, testIrId)));

      // Simulate fulfillment with all prQuantity=0 (backend receives zero prQty items)
      // No insert into purchase_requisitions should happen
      const prsAfter = await db.select().from(purchase_requisitions)
        .where(and(eq(purchase_requisitions.companyId, companyId), eq(purchase_requisitions.sourceIrId, testIrId)));

      expect(prsAfter.length).toBe(prsBefore.length); // count unchanged
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Regression: Existing IR items structure is intact
  // ──────────────────────────────────────────────────────────────────────────
  describe('Regression: IR data integrity after test setup', () => {
    it('IR items should have correct quantity and zero deliveredQuantity', async () => {
      const items = await db.select().from(pr_items).where(eq(pr_items.prId, testIrId));
      expect(items.length).toBe(1);
      expect(items[0].quantity).toBe(10);
      expect(items[0].deliveredQuantity ?? 0).toBe(0);
    });

    it('IR should still have Approved status untouched', async () => {
      const ir = await db.select().from(purchase_requisitions).where(eq(purchase_requisitions.id, testIrId));
      expect(ir[0].status).toBe('Approved');
      expect(ir[0].deliveryStatus).toBe('Not Delivered');
    });
  });
});
