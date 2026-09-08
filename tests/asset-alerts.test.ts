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

describe('Asset Warranty & Maintenance Expiration Alerts API', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/assets/reports', assetReportsRouter);
  });

  it('T1: GET /api/assets/reports/alerts should return warrantyAlerts, maintenanceAlerts, and branchSummary', async () => {
    const now = new Date();
    const expiredWarrantyDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
    const expiringSoonWarrantyDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days from now
    const validWarrantyDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days from now

    const overdueMaintDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
    const dueSoonMaintDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
    const okMaintDate = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000); // 20 days from now

    const mockAssets = [
      {
        id: 'ast-1',
        assetCode: 'AST-001',
        name: 'Laptop 1',
        categoryId: 'cat-1',
        categoryName: 'IT',
        branchId: 1,
        branchName: 'Dhaka Branch',
        custodianName: 'John',
        acquisitionCost: '100000.00',
        currentBookValue: '80000.00',
        warrantyExpiryDate: expiredWarrantyDate,
        nextMaintenanceDue: overdueMaintDate,
        status: 'Active'
      },
      {
        id: 'ast-2',
        assetCode: 'AST-002',
        name: 'Generator 1',
        categoryId: 'cat-2',
        categoryName: 'Machinery',
        branchId: 1,
        branchName: 'Dhaka Branch',
        custodianName: 'Smith',
        acquisitionCost: '500000.00',
        currentBookValue: '450000.00',
        warrantyExpiryDate: expiringSoonWarrantyDate,
        nextMaintenanceDue: dueSoonMaintDate,
        status: 'Active'
      },
      {
        id: 'ast-3',
        assetCode: 'AST-003',
        name: 'SUV Car',
        categoryId: 'cat-3',
        categoryName: 'Vehicles',
        branchId: 2,
        branchName: 'Chittagong Branch',
        custodianName: 'Alex',
        acquisitionCost: '3000000.00',
        currentBookValue: '2800000.00',
        warrantyExpiryDate: validWarrantyDate,
        nextMaintenanceDue: okMaintDate,
        status: 'Active'
      }
    ];

    mockDbSelect.mockResolvedValue(mockAssets);

    const res = await request(app).get('/api/assets/reports/alerts');

    expect(res.status).toBe(200);
    expect(res.body.summary).toBeDefined();
    expect(res.body.summary.totalWarrantyAlerts).toBe(2); // 1 expired + 1 expiring soon
    expect(res.body.summary.expiredWarrantyCount).toBe(1);
    expect(res.body.summary.expiringSoonWarrantyCount).toBe(1);
    expect(res.body.summary.totalMaintenanceAlerts).toBe(2); // 1 overdue + 1 due soon
    expect(res.body.summary.overdueMaintenanceCount).toBe(1);
    expect(res.body.summary.dueSoonMaintenanceCount).toBe(1);
    expect(res.body.branchSummary.length).toBe(2);
  });

  it('T2: T3: T4: should accurately classify warranty and maintenance alert levels and calculate daysRemaining', async () => {
    const now = new Date();
    const expiredWarrantyDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    const overdueMaintDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

    mockDbSelect.mockResolvedValue([
      {
        id: 'ast-1',
        assetCode: 'AST-001',
        name: 'Server Rack',
        categoryId: 'cat-1',
        categoryName: 'IT',
        branchId: 1,
        branchName: 'Main HQ',
        custodianName: null,
        acquisitionCost: '200000.00',
        currentBookValue: '180000.00',
        warrantyExpiryDate: expiredWarrantyDate,
        nextMaintenanceDue: overdueMaintDate,
        status: 'Active'
      }
    ]);

    const res = await request(app).get('/api/assets/reports/alerts');

    expect(res.status).toBe(200);
    expect(res.body.warrantyAlerts[0].alertStatus).toBe('Expired');
    expect(res.body.warrantyAlerts[0].alertLevel).toBe('critical');
    expect(res.body.warrantyAlerts[0].daysRemaining).toBeLessThan(0);

    expect(res.body.maintenanceAlerts[0].alertStatus).toBe('Overdue');
    expect(res.body.maintenanceAlerts[0].alertLevel).toBe('critical');
    expect(res.body.maintenanceAlerts[0].daysRemaining).toBeLessThan(0);
  });

  it('T5: should handle assets without warrantyExpiryDate or nextMaintenanceDue gracefully', async () => {
    mockDbSelect.mockResolvedValue([
      {
        id: 'ast-10',
        assetCode: 'AST-010',
        name: 'Office Chair',
        categoryId: 'cat-4',
        categoryName: 'Furniture',
        branchId: 1,
        branchName: 'Main HQ',
        custodianName: null,
        acquisitionCost: '15000.00',
        currentBookValue: '12000.00',
        warrantyExpiryDate: null,
        nextMaintenanceDue: null,
        status: 'Active'
      }
    ]);

    const res = await request(app).get('/api/assets/reports/alerts');

    expect(res.status).toBe(200);
    expect(res.body.summary.totalWarrantyAlerts).toBe(0);
    expect(res.body.summary.totalMaintenanceAlerts).toBe(0);
    expect(res.body.warrantyAlerts.length).toBe(0);
    expect(res.body.maintenanceAlerts.length).toBe(0);
    expect(res.body.branchSummary[0].totalAssets).toBe(1);
  });

  it('T6: should aggregate branch Summary correctly', async () => {
    mockDbSelect.mockResolvedValue([
      {
        id: 'ast-1',
        assetCode: 'AST-001',
        name: 'PC 1',
        branchId: 1,
        branchName: 'Gulshan Branch',
        acquisitionCost: '100000.00',
        currentBookValue: '90000.00',
        status: 'Active'
      },
      {
        id: 'ast-2',
        assetCode: 'AST-002',
        name: 'PC 2',
        branchId: 1,
        branchName: 'Gulshan Branch',
        acquisitionCost: '120000.00',
        currentBookValue: '110000.00',
        status: 'Active'
      }
    ]);

    const res = await request(app).get('/api/assets/reports/alerts');

    expect(res.status).toBe(200);
    expect(res.body.branchSummary.length).toBe(1);
    expect(res.body.branchSummary[0].branchName).toBe('Gulshan Branch');
    expect(res.body.branchSummary[0].totalAssets).toBe(2);
    expect(res.body.branchSummary[0].totalCost).toBe('220000.00');
    expect(res.body.branchSummary[0].totalNetBookValue).toBe('200000.00');
  });

  it('T7: GET /api/assets/reports/register should return warrantyExpiryDate, nextMaintenanceDue, and depreciationPercent', async () => {
    mockDbSelect.mockResolvedValue([
      {
        id: 'ast-1',
        assetCode: 'AST-001',
        name: 'Printer',
        acquisitionCost: '100000.00',
        accumulatedDepreciation: '25000.00',
        currentBookValue: '75000.00',
        warrantyExpiryDate: new Date('2027-01-01'),
        nextMaintenanceDue: new Date('2026-10-01'),
        status: 'Active'
      }
    ]);

    const res = await request(app).get('/api/assets/reports/register');

    expect(res.status).toBe(200);
    expect(res.body.register[0].depreciationPercent).toBe(25);
    expect(res.body.register[0].warrantyExpiryDate).toBeDefined();
    expect(res.body.register[0].nextMaintenanceDue).toBeDefined();
  });
});
