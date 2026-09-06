import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock auth middleware
vi.mock('../src/shared/middleware/auth.js', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { uid: 'user-maint-tech', role: 'Super Admin', companyId: 'company-uuid-111' };
    next();
  }
}));

// Mock checkPlugin middleware
vi.mock('../src/shared/middleware/checkPlugin.js', () => ({
  checkPlugin: () => (req: any, res: any, next: any) => next()
}));

// Mocks
const mockDbSelect = vi.fn();
const mockDbInsert = vi.fn();
const mockDbUpdate = vi.fn();

vi.mock('../src/shared/db/index.js', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => Promise.resolve(mockDbSelect()),
          limit: () => Promise.resolve(mockDbSelect())
        }),
        leftJoin: () => ({
          where: () => ({
            orderBy: () => Promise.resolve(mockDbSelect())
          })
        })
      })
    }),
    insert: () => ({
      values: () => ({
        returning: () => Promise.resolve(mockDbInsert())
      })
    }),
    update: () => ({
      set: () => ({
        where: () => {
          const fn = () => mockDbUpdate() || [];
          return {
            then: (resolve: any, reject: any) => Promise.resolve(fn()).then(resolve, reject),
            returning: () => Promise.resolve(fn())
          };
        }
      })
    })
  }
}));

import assetsRouter from '../src/modules/assets/api/routes.js';

describe('Phase 8 — Asset Maintenance Tracking API', () => {
  let app: express.Express;
  const testCompanyId = 'company-uuid-111';

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/assets', assetsRouter);
  });

  it('should log maintenance task and update asset status to UnderMaintenance', async () => {
    const mockAsset = {
      id: 'asset-300',
      companyId: testCompanyId,
      name: 'CNC Machine',
      status: 'Active'
    };

    // 1st select: asset lookup
    mockDbSelect.mockReturnValueOnce([mockAsset]);
    // 2nd select: open maintenance check -> []
    mockDbSelect.mockReturnValueOnce([]);

    const mockMaintRecord = {
      id: 'maint-1',
      assetId: 'asset-300',
      maintenanceType: 'Preventive',
      cost: '1500.00',
      status: 'InProgress'
    };

    mockDbInsert.mockReturnValueOnce([mockMaintRecord]);
    mockDbUpdate.mockReturnValueOnce([{ ...mockAsset, status: 'UnderMaintenance' }]);

    const res = await request(app)
      .post('/api/assets/asset-300/maintenance')
      .set('x-tenant-id', testCompanyId)
      .send({
        maintenanceType: 'Preventive',
        cost: 1500,
        scheduledDate: '2026-09-10'
      });

    expect(res.status).toBe(201);
    expect(res.body.maintenance.status).toBe('InProgress');
    expect(res.body.asset.status).toBe('UnderMaintenance');
  });

  it('should prevent creating a second open maintenance task for the same asset', async () => {
    const mockAsset = {
      id: 'asset-301',
      companyId: testCompanyId,
      name: 'Generator 500kVA',
      status: 'UnderMaintenance'
    };

    const mockExistingOpenMaint = [{ id: 'maint-active', status: 'InProgress' }];

    mockDbSelect.mockReturnValueOnce([mockAsset]);
    mockDbSelect.mockReturnValueOnce(mockExistingOpenMaint);

    const res = await request(app)
      .post('/api/assets/asset-301/maintenance')
      .set('x-tenant-id', testCompanyId)
      .send({
        maintenanceType: 'Corrective',
        scheduledDate: '2026-09-15'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Asset already has an active or scheduled maintenance task in progress');
  });

  it('should complete maintenance and restore asset status to Active', async () => {
    const mockMaintRecord = {
      id: 'maint-100',
      companyId: testCompanyId,
      assetId: 'asset-300',
      status: 'InProgress'
    };

    mockDbSelect.mockReturnValueOnce([mockMaintRecord]);
    mockDbUpdate.mockReturnValueOnce([{ ...mockMaintRecord, status: 'Completed' }]);
    mockDbUpdate.mockReturnValueOnce([{ id: 'asset-300', status: 'Active' }]);

    const res = await request(app)
      .put('/api/assets/maintenance/maint-100/complete')
      .set('x-tenant-id', testCompanyId)
      .send({
        nextDueDate: '2026-12-10'
      });

    expect(res.status).toBe(200);
    expect(res.body.maintenance.status).toBe('Completed');
    expect(res.body.asset.status).toBe('Active');
  });
});
