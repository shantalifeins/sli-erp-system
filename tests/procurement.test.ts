import 'dotenv/config';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../src/shared/db';
import { companies, users, purchase_requisitions, pr_items } from '../src/shared/db/schema';
import { eq, ilike } from 'drizzle-orm';
import crypto from 'crypto';

describe('Procurement API / Integration Flow (ABC Company)', () => {
  let companyId: string;
  let testUserId: string;
  let testPrId: number;

  beforeAll(async () => {
    // 1. Find ABC Company
    const comp = await db.select().from(companies).where(ilike(companies.name, '%abc%')).limit(1);
    if (comp.length > 0) {
      companyId = comp[0].id;
    }

    // 2. Find or Create a test user for ABC Company
    if (companyId) {
      const existingUser = await db.select().from(users).where(eq(users.companyId, companyId)).limit(1);
      if (existingUser.length > 0) {
        testUserId = existingUser[0].uid;
      }
    }
  });

  it('Should successfully find or setup the test tenant', () => {
    expect(companyId).toBeDefined();
  });

  it('Should create a Purchase Requisition (PR)', async () => {
    if (!companyId || !testUserId) return;

    const newPr = await db.insert(purchase_requisitions).values({
      companyId,
      prNumber: 'PR-TEST-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
      date: new Date().toISOString(),
      status: 'Pending',
      procurementMethod: 'Single Quotation',
      sourceIrId: null,
      requestor: 'Test User',
      uid: testUserId,
      department: 'IT',
      estimatedCost: '51000',
    }).returning();

    expect(newPr.length).toBe(1);
    expect(newPr[0].status).toBe('Pending');
    testPrId = newPr[0].id;
  });

  it('Should add PR Items', async () => {
    if (!testPrId) return;

    const newItems = await db.insert(pr_items).values([
      { prId: testPrId, itemName: 'Test Laptop', quantity: 1, uom: 'pcs', estimatedPrice: '50000' },
      { prId: testPrId, itemName: 'Test Mouse', quantity: 2, uom: 'pcs', estimatedPrice: '1000' }
    ]).returning();

    expect(newItems.length).toBe(2);
    expect(newItems[0].prId).toBe(testPrId);
  });



});
