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

describe('Phase 9 — Asset Disposal & Write-off Workflow API', () => {
  let app: express.Express;
  const testCompanyId = 'company-uuid-111';

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/assets', assetsRouter);
  });

  it('should compute gainLoss and auto-approve disposal when no workflow is defined', async () => {
    const mockAsset = {
      id: 'asset-400',
      companyId: testCompanyId,
      name: 'Delivery Van',
      currentBookValue: '80000.00',
      status: 'Active'
    };

    // 1st select: asset lookup
    mockDbSelect.mockReturnValueOnce([mockAsset]);
    // 2nd select: workflow lookup -> []
    mockDbSelect.mockReturnValueOnce([]);

    const mockDisposalRecord = {
      id: 'disp-1',
      assetId: 'asset-400',
      disposalType: 'Sale',
      saleAmount: '100000.00',
      bookValueAtDisposal: '80000.00',
      gainLoss: '20000.00',
      status: 'Approved'
    };

    mockDbInsert.mockReturnValueOnce([mockDisposalRecord]);
    mockDbUpdate.mockReturnValueOnce([{ status: 'Cancelled' }]); // depreciation rows
    mockDbUpdate.mockReturnValueOnce([{ ...mockAsset, status: 'Sold' }]); // asset status

    const res = await request(app)
      .post('/api/assets/asset-400/disposal')
      .set('x-tenant-id', testCompanyId)
      .send({
        disposalType: 'Sale',
        saleAmount: 100000,
        disposalDate: '2026-09-06'
      });

    expect(res.status).toBe(200);
    expect(res.body.workflowTriggered).toBe(false);
    expect(res.body.disposal.gainLoss).toBe('20000.00');
    expect(res.body.asset.status).toBe('Sold');
  });

  it('should trigger workflow request for disposal when definition exists', async () => {
    const mockAsset = {
      id: 'asset-401',
      companyId: testCompanyId,
      name: 'Server Rack 24U',
      currentBookValue: '50000.00',
      status: 'Active'
    };

    const mockWf = {
      id: 'wf-disp',
      companyId: testCompanyId,
      documentType: 'Asset Disposal'
    };

    mockDbSelect.mockReturnValueOnce([mockAsset]);
    mockDbSelect.mockReturnValueOnce([mockWf]);

    const mockDisposalRecord = {
      id: 'disp-2',
      assetId: 'asset-401',
      status: 'Pending'
    };
    mockDbInsert.mockReturnValueOnce([mockDisposalRecord]);

    const res = await request(app)
      .post('/api/assets/asset-401/disposal')
      .set('x-tenant-id', testCompanyId)
      .send({
        disposalType: 'Scrap',
        saleAmount: 0
      });

    expect(res.status).toBe(200);
    expect(res.body.workflowTriggered).toBe(true);
    expect(res.body.disposal.status).toBe('Pending');
  });

  it('should approve asset disposal, cancel remaining depreciation schedule, and set asset to Disposed', async () => {
    const mockDisposalRecord = {
      id: 'disp-100',
      companyId: testCompanyId,
      assetId: 'asset-400',
      disposalType: 'Scrap',
      status: 'Pending'
    };

    mockDbSelect.mockReturnValueOnce([mockDisposalRecord]);
    mockDbUpdate.mockReturnValueOnce([{ status: 'Completed' }]); // inbox_tasks
    mockDbUpdate.mockReturnValueOnce([{ status: 'Approved' }]); // document_approvals
    mockDbUpdate.mockReturnValueOnce([{ ...mockDisposalRecord, status: 'Approved' }]); // asset_disposals
    mockDbUpdate.mockReturnValueOnce([{ status: 'Cancelled' }]); // asset_depreciation_schedule
    mockDbUpdate.mockReturnValueOnce([{ id: 'asset-400', status: 'Disposed' }]); // assets

    const res = await request(app)
      .post('/api/assets/disposals/disp-100/approve')
      .set('x-tenant-id', testCompanyId);

    expect(res.status).toBe(200);
    expect(res.body.disposal.status).toBe('Approved');
    expect(res.body.asset.status).toBe('Disposed');
  });

  it('should reject asset disposal request', async () => {
    const mockDisposalRecord = {
      id: 'disp-101',
      companyId: testCompanyId,
      assetId: 'asset-400',
      status: 'Pending'
    };

    mockDbSelect.mockReturnValueOnce([mockDisposalRecord]);
    mockDbUpdate.mockReturnValueOnce([{ status: 'Completed' }]); // inbox_tasks
    mockDbUpdate.mockReturnValueOnce([{ status: 'Rejected' }]); // document_approvals
    mockDbUpdate.mockReturnValueOnce([{ ...mockDisposalRecord, status: 'Rejected' }]); // asset_disposals

    const res = await request(app)
      .post('/api/assets/disposals/disp-101/reject')
      .set('x-tenant-id', testCompanyId);

    expect(res.status).toBe(200);
    expect(res.body.disposal.status).toBe('Rejected');
  });
});
