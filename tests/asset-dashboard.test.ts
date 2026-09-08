import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock auth middleware
vi.mock('../src/shared/middleware/auth.js', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { uid: 'user-finance-head', role: 'Super Admin', companyId: 'company-uuid-111' };
    next();
  }
}));

// Mock checkPlugin middleware
vi.mock('../src/shared/middleware/checkPlugin.js', () => ({
  checkPlugin: () => (req: any, res: any, next: any) => next()
}));

// Mocks for db calls
const mockDbSelect = vi.fn();

const createChainableQuery = () => {
  const chain: any = {
    from: () => chain,
    leftJoin: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => chain,
    then: (resolve: any, reject: any) => Promise.resolve(mockDbSelect()).then(resolve, reject)
  };
  return chain;
};

vi.mock('../src/shared/db/index.js', () => ({
  db: {
    select: () => createChainableQuery()
  }
}));

import assetsRouter from '../src/modules/assets/api/routes.js';

describe('Asset Dashboard Analytics API (GET /api/assets/dashboard)', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/assets', assetsRouter);
  });

  it('T1: GET /api/assets/dashboard should return comprehensive metrics, charts, branchSummary, categoryBreakdown, recentAssets, and criticalAlerts', async () => {
    const now = new Date();
    const expiredWarrantyDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const overdueMaintDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    const mockAssets = [
      {
        id: 'ast-1',
        assetCode: 'AST-001',
        name: 'Dell XPS Laptop',
        categoryId: 'cat-1',
        categoryName: 'IT Equipment',
        branchId: 101,
        branchName: 'Dhaka HQ',
        departmentId: 1,
        departmentName: 'IT Dept',
        custodianUid: 'user-1',
        custodianName: 'Rahim Ahmed',
        acquisitionDate: new Date('2025-01-15'),
        acquisitionCost: '120000.00',
        salvageValue: '20000.00',
        usefulLifeMonths: 36,
        depreciationMethod: 'Straight Line',
        decliningRate: '0.00',
        accumulatedDepreciation: '20000.00',
        currentBookValue: '100000.00',
        status: 'Active',
        sourceType: 'Direct Purchase',
        serialNumber: 'SN-XPS-991',
        warrantyExpiryDate: expiredWarrantyDate,
        nextMaintenanceDue: overdueMaintDate,
        createdAt: new Date()
      },
      {
        id: 'ast-2',
        assetCode: 'AST-002',
        name: 'Ergonomic Executive Chair',
        categoryId: 'cat-2',
        categoryName: 'Furniture & Fixtures',
        branchId: 102,
        branchName: 'Chittagong Hub',
        departmentId: 2,
        departmentName: 'HR Dept',
        custodianUid: 'user-2',
        custodianName: 'Karim Ullah',
        acquisitionDate: new Date('2025-02-10'),
        acquisitionCost: '35000.00',
        salvageValue: '5000.00',
        usefulLifeMonths: 60,
        depreciationMethod: 'Straight Line',
        decliningRate: '0.00',
        accumulatedDepreciation: '3000.00',
        currentBookValue: '32000.00',
        status: 'Draft',
        sourceType: 'GRN',
        serialNumber: 'SN-CHR-002',
        warrantyExpiryDate: null,
        nextMaintenanceDue: null,
        createdAt: new Date()
      }
    ];

    mockDbSelect.mockResolvedValueOnce(mockAssets);

    const res = await request(app)
      .get('/api/assets/dashboard')
      .query({ branchId: '101' });

    expect(res.status).toBe(200);

    const { metrics, charts, branchSummary, categoryBreakdown, recentAssets } = res.body;

    expect(metrics).toBeDefined();
    expect(metrics.totalAssetsCount).toBe(2);
    expect(Number(metrics.totalAcquisitionCost)).toBe(155000);
    expect(Number(metrics.totalNetBookValue)).toBe(132000);
    expect(metrics.activeCount).toBe(1);
    expect(metrics.draftCount).toBe(1);
    expect(metrics.warrantyAlertsCount).toBe(1);
    expect(metrics.maintenanceAlertsCount).toBe(1);

    expect(charts).toBeDefined();
    expect(charts.branchValuation.length).toBeGreaterThan(0);
    expect(charts.categoryValuation.length).toBeGreaterThan(0);
    expect(charts.statusDistribution.length).toBeGreaterThan(0);

    expect(branchSummary.length).toBeGreaterThan(0);
    expect(categoryBreakdown.length).toBeGreaterThan(0);
    expect(recentAssets.length).toBe(2);
  });

  it('T2: GET /api/assets/dashboard with category and status filter params', async () => {
    mockDbSelect.mockResolvedValueOnce([]);

    const res = await request(app)
      .get('/api/assets/dashboard')
      .query({ categoryId: 'cat-1', status: 'Active', search: 'Dell' });

    expect(res.status).toBe(200);
    expect(res.body.metrics.totalAssetsCount).toBe(0);
    expect(Number(res.body.metrics.totalAcquisitionCost)).toBe(0);
  });
});
