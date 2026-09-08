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

import assetReportsRouter from '../src/modules/assets/api/reports.js';

describe('Phase 10 — Asset Management Reports & Valuation Summary API', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/assets/reports', assetReportsRouter);
  });

  it('GET /api/assets/reports/register should return detailed asset register list', async () => {
    const mockAssets = [
      {
        id: 'ast-1',
        assetCode: 'AST-20260906-0001',
        name: 'Dell Latitude Laptop',
        categoryName: 'IT Hardware',
        branchName: 'Main Branch',
        departmentName: 'IT',
        custodianName: 'John Doe',
        acquisitionDate: '2026-01-15',
        acquisitionCost: '120000.00',
        salvageValue: '10000.00',
        usefulLifeMonths: 36,
        accumulatedDepreciation: '20000.00',
        currentBookValue: '100000.00',
        status: 'Active',
        sourceType: 'Procurement',
        serialNumber: 'SN-998811'
      }
    ];

    mockDbSelect.mockResolvedValue(mockAssets);

    const res = await request(app).get('/api/assets/reports/register?status=Active');

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.register[0].assetCode).toBe('AST-20260906-0001');
    expect(res.body.register[0].currentBookValue).toBe('100000.00');
  });

  it('GET /api/assets/reports/depreciation should calculate totalPosted and totalScheduled summary', async () => {
    const mockSchedule = [
      {
        id: 'sch-1',
        assetId: 'ast-1',
        assetCode: 'AST-20260906-0001',
        assetName: 'Dell Latitude Laptop',
        categoryName: 'IT Hardware',
        periodNumber: 1,
        periodDate: '2026-02-15',
        depreciationAmount: '3055.56',
        accumulatedDepreciation: '3055.56',
        bookValueAfter: '116944.44',
        status: 'Posted'
      },
      {
        id: 'sch-2',
        assetId: 'ast-1',
        assetCode: 'AST-20260906-0001',
        assetName: 'Dell Latitude Laptop',
        categoryName: 'IT Hardware',
        periodNumber: 2,
        periodDate: '2026-03-15',
        depreciationAmount: '3055.56',
        accumulatedDepreciation: '6111.12',
        bookValueAfter: '113888.88',
        status: 'Scheduled'
      }
    ];

    mockDbSelect.mockResolvedValue(mockSchedule);

    const res = await request(app).get('/api/assets/reports/depreciation');

    expect(res.status).toBe(200);
    expect(res.body.summary.totalPosted).toBe('3055.56');
    expect(res.body.summary.totalScheduled).toBe('3055.56');
    expect(res.body.summary.totalPeriods).toBe(2);
    expect(res.body.schedule.length).toBe(2);
  });

  it('GET /api/assets/reports/depreciation should support startMonth and endMonth range filtering', async () => {
    const mockSchedule = [
      {
        id: 'sch-1',
        assetId: 'ast-1',
        assetCode: 'AST-20260906-0001',
        assetName: 'Dell Latitude Laptop',
        categoryName: 'IT Hardware',
        periodNumber: 3,
        periodDate: '2026-03-15',
        depreciationAmount: '3055.56',
        accumulatedDepreciation: '9166.68',
        bookValueAfter: '110833.32',
        status: 'Posted'
      }
    ];

    mockDbSelect.mockResolvedValue(mockSchedule);

    const res = await request(app)
      .get('/api/assets/reports/depreciation?startMonth=2026-03&endMonth=2026-03&search=Dell&categoryId=cat-1');

    expect(res.status).toBe(200);
    expect(res.body.schedule.length).toBe(1);
    expect(res.body.schedule[0].periodNumber).toBe(3);
  });

  it('GET /api/assets/reports/valuation should calculate valuation totals and category/branch breakdowns', async () => {
    const mockAssets = [
      {
        id: 'ast-1',
        categoryId: 'cat-1',
        categoryName: 'IT Hardware',
        branchId: 1,
        branchName: 'Headquarters',
        acquisitionCost: '100000.00',
        accumulatedDepreciation: '20000.00',
        currentBookValue: '80000.00',
        status: 'Active'
      },
      {
        id: 'ast-2',
        categoryId: 'cat-2',
        categoryName: 'Office Furniture',
        branchId: 1,
        branchName: 'Headquarters',
        acquisitionCost: '50000.00',
        accumulatedDepreciation: '5000.00',
        currentBookValue: '45000.00',
        status: 'Active'
      }
    ];

    mockDbSelect.mockResolvedValue(mockAssets);

    const res = await request(app).get('/api/assets/reports/valuation');

    expect(res.status).toBe(200);
    expect(res.body.summary.totalAssetsCount).toBe(2);
    expect(res.body.summary.totalAcquisitionCost).toBe('150000.00');
    expect(res.body.summary.totalAccumulatedDepreciation).toBe('25000.00');
    expect(res.body.summary.totalNetBookValue).toBe('125000.00');

    expect(res.body.byCategory.length).toBe(2);
    expect(res.body.byBranch.length).toBe(1);
    expect(res.body.byBranch[0].branchName).toBe('Headquarters');
    expect(res.body.byBranch[0].count).toBe(2);
  });
});
