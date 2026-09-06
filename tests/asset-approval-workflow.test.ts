import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock auth middleware
vi.mock('../src/shared/middleware/auth.js', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { uid: 'user-approver-999', role: 'Head of Operations', companyId: 'company-uuid-111' };
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
const mockDbDelete = vi.fn();

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
        where: () => ({
          returning: () => Promise.resolve(mockDbUpdate())
        })
      })
    }),
    delete: () => ({
      where: () => Promise.resolve(mockDbDelete())
    })
  }
}));

import assetsRouter from '../src/modules/assets/api/routes.js';

describe('Phase 6 — Asset Acquisition Approval Workflow API', () => {
  let app: express.Express;
  const testCompanyId = 'company-uuid-111';

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/assets', assetsRouter);
  });

  it('should auto-activate asset if no workflow definition exists for tenant', async () => {
    const mockAsset = {
      id: 'asset-100',
      companyId: testCompanyId,
      assetCode: 'AST-20260906-0001',
      name: 'Executive Workstation',
      acquisitionCost: '120000.00',
      salvageValue: '0.00',
      usefulLifeMonths: 12,
      status: 'Draft'
    };

    // 1st select: asset lookup
    mockDbSelect.mockReturnValueOnce([mockAsset]);
    // 2nd select: workflow lookup -> [] (no workflow defined)
    mockDbSelect.mockReturnValueOnce([]);

    // Insert mock for schedule bulk insert
    mockDbInsert.mockReturnValue([]);

    // Update mock for asset activation
    mockDbUpdate.mockReturnValue([{ ...mockAsset, status: 'Active' }]);

    const res = await request(app)
      .post('/api/assets/asset-100/submit')
      .set('x-tenant-id', testCompanyId);

    expect(res.status).toBe(200);
    expect(res.body.workflowTriggered).toBe(false);
    expect(res.body.asset.status).toBe('Active');
  });

  it('should submit asset and create document_approvals & inbox_tasks when workflow definition exists', async () => {
    const mockAsset = {
      id: 'asset-101',
      companyId: testCompanyId,
      assetCode: 'AST-20260906-0002',
      name: 'Dell PowerEdge Server',
      status: 'Draft'
    };

    const mockWf = {
      id: 'wf-1',
      companyId: testCompanyId,
      documentType: 'Asset Acquisition',
      name: 'Asset Acquisition Workflow'
    };

    // 1st select: asset lookup
    mockDbSelect.mockReturnValueOnce([mockAsset]);
    // 2nd select: workflow lookup -> found
    mockDbSelect.mockReturnValueOnce([mockWf]);

    // 1st insert: document_approvals
    mockDbInsert.mockReturnValueOnce([{ id: 'appr-1', status: 'Pending' }]);
    // 2nd insert: inbox_tasks
    mockDbInsert.mockReturnValueOnce([{ id: 'task-1', status: 'Pending' }]);

    // Update asset status to PendingApproval
    mockDbUpdate.mockReturnValue([{ ...mockAsset, status: 'PendingApproval' }]);

    const res = await request(app)
      .post('/api/assets/asset-101/submit')
      .set('x-tenant-id', testCompanyId);

    expect(res.status).toBe(200);
    expect(res.body.workflowTriggered).toBe(true);
    expect(res.body.asset.status).toBe('PendingApproval');
  });

  it('should approve asset acquisition, complete inbox tasks, and generate depreciation schedule', async () => {
    const mockAsset = {
      id: 'asset-102',
      companyId: testCompanyId,
      name: 'MacBook Air M2',
      acquisitionCost: '150000.00',
      salvageValue: '0.00',
      usefulLifeMonths: 36,
      status: 'PendingApproval'
    };

    mockDbSelect.mockReturnValueOnce([mockAsset]);
    mockDbUpdate.mockReturnValue([{ ...mockAsset, status: 'Active' }]);

    const res = await request(app)
      .post('/api/assets/asset-102/approve')
      .set('x-tenant-id', testCompanyId)
      .send({ comments: 'Approved by Ops' });

    expect(res.status).toBe(200);
    expect(res.body.asset.status).toBe('Active');
    expect(res.body.scheduleCount).toBe(36);
  });

  it('should reject asset acquisition and reset status to Draft', async () => {
    const mockAsset = {
      id: 'asset-103',
      companyId: testCompanyId,
      name: 'Industrial Printer',
      status: 'PendingApproval'
    };

    mockDbSelect.mockReturnValueOnce([mockAsset]);
    mockDbUpdate.mockReturnValue([{ ...mockAsset, status: 'Draft' }]);

    const res = await request(app)
      .post('/api/assets/asset-103/reject')
      .set('x-tenant-id', testCompanyId)
      .send({ comments: 'Budget exceeded' });

    expect(res.status).toBe(200);
    expect(res.body.asset.status).toBe('Draft');
  });
});
