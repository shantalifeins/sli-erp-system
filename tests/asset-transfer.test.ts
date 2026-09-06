import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock auth middleware
vi.mock('../src/shared/middleware/auth.js', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { uid: 'user-manager-10', role: 'Super Admin', companyId: 'company-uuid-111' };
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

describe('Phase 7 — Asset Transfer Workflow API', () => {
  let app: express.Express;
  const testCompanyId = 'company-uuid-111';

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/assets', assetsRouter);
  });

  it('should auto-approve asset transfer when no workflow is defined', async () => {
    const mockAsset = {
      id: 'asset-200',
      companyId: testCompanyId,
      name: 'High-End Workstation',
      branchId: 1,
      custodianUid: 'user-1'
    };

    // 1st select: asset lookup
    mockDbSelect.mockReturnValueOnce([mockAsset]);
    // 2nd select: workflow lookup -> [] (no workflow)
    mockDbSelect.mockReturnValueOnce([]);

    // Insert mock for asset_transfers
    const mockTransfer = {
      id: 'tr-1',
      assetId: 'asset-200',
      toBranchId: 2,
      toCustodianUid: 'user-2',
      status: 'Approved'
    };
    mockDbInsert.mockReturnValueOnce([mockTransfer]);

    // Update asset mock
    mockDbUpdate.mockReturnValueOnce([{ ...mockAsset, branchId: 2, custodianUid: 'user-2' }]);

    const res = await request(app)
      .post('/api/assets/asset-200/transfer')
      .set('x-tenant-id', testCompanyId)
      .send({
        toBranchId: 2,
        toCustodianUid: 'user-2',
        reason: 'Transferred to Branch B IT Team'
      });

    expect(res.status).toBe(200);
    expect(res.body.workflowTriggered).toBe(false);
    expect(res.body.transfer.status).toBe('Approved');
    expect(res.body.asset.branchId).toBe(2);
    expect(res.body.asset.custodianUid).toBe('user-2');
  });

  it('should create pending transfer and trigger approval workflow when definition exists', async () => {
    const mockAsset = {
      id: 'asset-201',
      companyId: testCompanyId,
      name: 'Server Rack',
      branchId: 1,
      custodianUid: 'user-1'
    };

    const mockWf = {
      id: 'wf-tr',
      companyId: testCompanyId,
      documentType: 'Asset Transfer'
    };

    mockDbSelect.mockReturnValueOnce([mockAsset]);
    mockDbSelect.mockReturnValueOnce([mockWf]);

    const mockTransfer = {
      id: 'tr-2',
      assetId: 'asset-201',
      status: 'Pending'
    };
    mockDbInsert.mockReturnValueOnce([mockTransfer]);

    const res = await request(app)
      .post('/api/assets/asset-201/transfer')
      .set('x-tenant-id', testCompanyId)
      .send({
        toBranchId: 3,
        toCustodianUid: 'user-3',
        reason: 'Office Relocation'
      });

    expect(res.status).toBe(200);
    expect(res.body.workflowTriggered).toBe(true);
    expect(res.body.transfer.status).toBe('Pending');
  });

  it('should approve asset transfer and update target asset custodian/branch', async () => {
    const mockTransfer = {
      id: 'tr-100',
      companyId: testCompanyId,
      assetId: 'asset-200',
      toBranchId: 5,
      toCustodianUid: 'user-custodian-5',
      status: 'Pending'
    };

    mockDbSelect.mockReturnValueOnce([mockTransfer]);
    mockDbUpdate.mockReturnValueOnce([{ status: 'Completed' }]); // inbox_tasks
    mockDbUpdate.mockReturnValueOnce([{ ...mockTransfer, status: 'Approved' }]); // asset_transfers
    mockDbUpdate.mockReturnValueOnce([{ id: 'asset-200', branchId: 5, custodianUid: 'user-custodian-5' }]); // assets

    const res = await request(app)
      .post('/api/assets/transfers/tr-100/approve')
      .set('x-tenant-id', testCompanyId);

    expect(res.status).toBe(200);
    expect(res.body.transfer.status).toBe('Approved');
    expect(res.body.asset.custodianUid).toBe('user-custodian-5');
  });

  it('should reject asset transfer request', async () => {
    const mockTransfer = {
      id: 'tr-101',
      companyId: testCompanyId,
      assetId: 'asset-200',
      status: 'Pending'
    };

    mockDbSelect.mockReturnValueOnce([mockTransfer]);
    mockDbUpdate.mockReturnValueOnce([{ status: 'Completed' }]); // inbox_tasks
    mockDbUpdate.mockReturnValueOnce([{ ...mockTransfer, status: 'Rejected' }]); // asset_transfers

    const res = await request(app)
      .post('/api/assets/transfers/tr-101/reject')
      .set('x-tenant-id', testCompanyId);

    expect(res.status).toBe(200);
    expect(res.body.transfer.status).toBe('Rejected');
  });
});
