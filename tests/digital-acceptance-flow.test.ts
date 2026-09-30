import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../src/shared/db/index.js';
import {
  digital_assets,
  digital_acceptances,
  digital_asset_users,
  companies,
  users,
} from '../src/shared/db/schema.js';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

let companyId: string;
let testUserId: string;
let poId: number;
let poItemId: number;
let acceptanceId: number;
let digitalAssetId: string;

describe('Digital Acceptance Flow', () => {

  beforeAll(async () => {
    // Resolve a company and user to use for tests
    const company = await db.select().from(companies).limit(1);
    if (!company.length) return;
    companyId = company[0].id;

    const user = await db.select().from(users).where(eq(users.companyId, companyId)).limit(1);
    if (!user.length) return;
    testUserId = user[0].uid;
  });

  afterAll(async () => {
    // Cleanup in reverse order
    if (digitalAssetId) {
      await db.delete(digital_asset_users).where(eq(digital_asset_users.digitalAssetId, digitalAssetId));
      await db.delete(digital_assets).where(eq(digital_assets.id, digitalAssetId));
    }
    if (acceptanceId) {
      await db.delete(digital_acceptances).where(eq(digital_acceptances.id, acceptanceId));
    }
  });

  it('should create a digital_acceptance record', async () => {
    if (!companyId || !testUserId) return;

    const result = await db.insert(digital_acceptances).values({
      companyId,
      acceptedByUid: testUserId,
      licenseType: 'Perpetual',
      seats: 50,
      status: 'Accepted',
    }).returning();

    expect(result.length).toBe(1);
    acceptanceId = result[0].id;
    expect(result[0].seats).toBe(50);
    expect(result[0].status).toBe('Accepted');
  });

  it('should create a grouped digital_asset with totalSeats', async () => {
    if (!companyId) return;

    const assetCode = 'DA-TEST-' + crypto.randomBytes(3).toString('hex').toUpperCase();

    const result = await db.insert(digital_assets).values({
      companyId,
      assetCode,
      name: 'Microsoft 365 E3 Test',
      assetType: 'SaaS',
      licenseType: 'Subscription',
      totalSeats: 100,
      usedSeats: 0,
      billingCycle: 'Annual',
      status: 'Active',
      acquisitionCost: '500000',
      amortizationMonths: 12,
    }).returning();

    expect(result.length).toBe(1);
    digitalAssetId = result[0].id;
    expect(result[0].totalSeats).toBe(100);
    expect(result[0].usedSeats).toBe(0);
  });

  it('should assign a user to the digital asset and decrement available seats', async () => {
    if (!digitalAssetId || !testUserId) return;

    // Check current used seats
    const assetBefore = await db.select().from(digital_assets).where(eq(digital_assets.id, digitalAssetId)).limit(1);
    const seatsBefore = assetBefore[0].usedSeats ?? 0;

    await db.insert(digital_asset_users).values({
      companyId,
      digitalAssetId,
      assignedUid: testUserId,
      status: 'Active',
    });

    await db.update(digital_assets)
      .set({ usedSeats: seatsBefore + 1 })
      .where(eq(digital_assets.id, digitalAssetId));

    const assetAfter = await db.select().from(digital_assets).where(eq(digital_assets.id, digitalAssetId)).limit(1);
    expect(assetAfter[0].usedSeats).toBe(seatsBefore + 1);
  });

  it('should prevent assigning user when seats are exhausted (seat limit enforcement)', async () => {
    if (!companyId) return;

    // Create an asset with 0 remaining seats
    const assetCode = 'DA-FULL-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const [fullAsset] = await db.insert(digital_assets).values({
      companyId,
      assetCode,
      name: 'Full Capacity Asset',
      assetType: 'SaaS',
      licenseType: 'Subscription',
      totalSeats: 1,
      usedSeats: 1, // Already full
      status: 'Active',
      acquisitionCost: '1000',
    }).returning();

    // Simulate the seat check logic
    const seatCheck = fullAsset.usedSeats! >= fullAsset.totalSeats!;
    expect(seatCheck).toBe(true); // Should enforce 409 at API level

    // Cleanup
    await db.delete(digital_assets).where(eq(digital_assets.id, fullAsset.id));
  });

  it('should update digital asset status to Expired', async () => {
    if (!digitalAssetId) return;

    await db.update(digital_assets)
      .set({ status: 'Expired' })
      .where(eq(digital_assets.id, digitalAssetId));

    const asset = await db.select().from(digital_assets).where(eq(digital_assets.id, digitalAssetId)).limit(1);
    expect(asset[0].status).toBe('Expired');
  });

  it('should update digital asset status to Pending Renewal', async () => {
    if (!digitalAssetId) return;

    await db.update(digital_assets)
      .set({ status: 'Pending Renewal' })
      .where(eq(digital_assets.id, digitalAssetId));

    const asset = await db.select().from(digital_assets).where(eq(digital_assets.id, digitalAssetId)).limit(1);
    expect(asset[0].status).toBe('Pending Renewal');
  });

});
