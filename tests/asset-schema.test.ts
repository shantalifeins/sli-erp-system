import { describe, it, expect } from 'vitest';
import { asset_categories, assets, asset_depreciation_schedule, asset_transfers, asset_maintenance, asset_disposals, plugins } from '../src/shared/db/schema.js';
import { getTableColumns } from 'drizzle-orm';

describe('Asset Management — Phase 1 Schema & Plugin Foundation', () => {
  it('should define asset_categories table with required multi-tenant & default fields', () => {
    const cols = getTableColumns(asset_categories);
    expect(cols.id).toBeDefined();
    expect(cols.companyId).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.code).toBeDefined();
    expect(cols.defaultDepreciationMethod).toBeDefined();
    expect(cols.defaultUsefulLifeMonths).toBeDefined();
    expect(cols.status).toBeDefined();
  });

  it('should define assets table with required fields and user cascade FKs', () => {
    const cols = getTableColumns(assets);
    expect(cols.id).toBeDefined();
    expect(cols.companyId).toBeDefined();
    expect(cols.assetCode).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.categoryId).toBeDefined();
    expect(cols.custodianUid).toBeDefined();
    expect(cols.acquisitionCost).toBeDefined();
    expect(cols.currentBookValue).toBeDefined();
    expect(cols.status).toBeDefined();
  });

  it('should define asset_depreciation_schedule table', () => {
    const cols = getTableColumns(asset_depreciation_schedule);
    expect(cols.id).toBeDefined();
    expect(cols.assetId).toBeDefined();
    expect(cols.periodNumber).toBeDefined();
    expect(cols.depreciationAmount).toBeDefined();
    expect(cols.bookValueAfter).toBeDefined();
  });

  it('should define asset_transfers table', () => {
    const cols = getTableColumns(asset_transfers);
    expect(cols.id).toBeDefined();
    expect(cols.assetId).toBeDefined();
    expect(cols.fromBranchId).toBeDefined();
    expect(cols.toBranchId).toBeDefined();
    expect(cols.status).toBeDefined();
  });

  it('should define asset_maintenance table', () => {
    const cols = getTableColumns(asset_maintenance);
    expect(cols.id).toBeDefined();
    expect(cols.assetId).toBeDefined();
    expect(cols.maintenanceType).toBeDefined();
    expect(cols.cost).toBeDefined();
    expect(cols.status).toBeDefined();
  });

  it('should define asset_disposals table', () => {
    const cols = getTableColumns(asset_disposals);
    expect(cols.id).toBeDefined();
    expect(cols.assetId).toBeDefined();
    expect(cols.disposalType).toBeDefined();
    expect(cols.gainLoss).toBeDefined();
    expect(cols.status).toBeDefined();
  });
});
