import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock auth middleware
vi.mock('../src/shared/middleware/auth.js', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { uid: 'user-auditor-1', role: 'Super Admin', companyId: 'company-uuid-111' };
    next();
  }
}));

// Mock checkPlugin middleware
vi.mock('../src/shared/middleware/checkPlugin.js', () => ({
  checkPlugin: () => (req: any, res: any, next: any) => next()
}));

// Mocks for db calls
const mockDbSelect = vi.fn();
const mockDbInsert = vi.fn();
const mockDbUpdate = vi.fn();

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
    select: () => createChainableQuery(),
    insert: () => ({
      values: (val: any) => ({
        returning: () => Promise.resolve(mockDbInsert(val))
      })
    }),
    update: () => ({
      set: (val: any) => ({
        where: () => {
          const fn = () => mockDbUpdate(val) || [];
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

describe('Phase 11 — Physical Verification Audit API', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/assets', assetsRouter);
  });

  it('POST /api/assets/verifications should create a physical verification session and detail lines', async () => {
    mockDbSelect
      .mockResolvedValueOnce([{ count: 0 }]) // count query for auto-code
      .mockResolvedValueOnce([ // target assets
        { id: 'ast-1', companyId: 'company-uuid-111', branchId: 1, custodianUid: 'u-1', status: 'Active' },
        { id: 'ast-2', companyId: 'company-uuid-111', branchId: 1, custodianUid: 'u-2', status: 'Active' }
      ]);

    const createdSession = {
      id: 'apv-uuid-101',
      companyId: 'company-uuid-111',
      verificationCode: 'APV-20260906-0001',
      branchId: 1,
      status: 'In-Progress'
    };

    mockDbInsert.mockImplementation((val: any) => {
      if (val.verificationCode) return [createdSession];
      return val;
    });

    const res = await request(app)
      .post('/api/assets/verifications')
      .send({ branchId: 1, notes: 'Annual physical count' });

    expect(res.status).toBe(201);
    expect(res.body.verification.verificationCode).toBe('APV-20260906-0001');
    expect(res.body.totalAssets).toBe(2);
  });

  it('GET /api/assets/verifications should return list of verification sessions', async () => {
    const mockSessions = [
      {
        id: 'apv-uuid-101',
        verificationCode: 'APV-20260906-0001',
        branchId: 1,
        branchName: 'Main Branch',
        status: 'In-Progress',
        verifiedByName: 'Auditor User',
        totalAssetsCounted: 2,
        totalMissing: 0,
        totalMisplaced: 0
      }
    ];

    mockDbSelect.mockResolvedValue(mockSessions);

    const res = await request(app).get('/api/assets/verifications');

    expect(res.status).toBe(200);
    expect(res.body.verifications.length).toBe(1);
    expect(res.body.verifications[0].verificationCode).toBe('APV-20260906-0001');
  });

  it('POST /api/assets/verifications/:id/scan should record audit scan and update session totals', async () => {
    const mockDetail = {
      id: 'det-1',
      verificationId: 'apv-uuid-101',
      assetId: 'ast-1',
      expectedBranchId: 1,
      condition: 'Good',
      verificationStatus: 'Unverified'
    };

    mockDbSelect
      .mockResolvedValueOnce([mockDetail]) // existing detail lookup
      .mockResolvedValueOnce([ // session details recalculation
        { status: 'Verified' },
        { status: 'Unverified' }
      ]);

    const updatedDetail = {
      ...mockDetail,
      condition: 'Good',
      verificationStatus: 'Verified',
      scannedAt: new Date()
    };

    mockDbUpdate.mockReturnValue([updatedDetail]);

    const res = await request(app)
      .post('/api/assets/verifications/apv-uuid-101/scan')
      .send({ detailId: 'det-1', condition: 'Good' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Verified');
  });

  it('PUT /api/assets/verifications/:id/complete should finalize session and mark unverified items as Missing', async () => {
    const completedSession = {
      id: 'apv-uuid-101',
      verificationCode: 'APV-20260906-0001',
      status: 'Completed',
      totalAssetsCounted: 2,
      totalMissing: 1,
      totalMisplaced: 0
    };

    mockDbSelect.mockResolvedValueOnce([
      { status: 'Verified' },
      { status: 'Missing' }
    ]);

    mockDbUpdate.mockReturnValue([completedSession]);

    const res = await request(app).put('/api/assets/verifications/apv-uuid-101/complete');

    expect(res.status).toBe(200);
    expect(res.body.session.status).toBe('Completed');
  });
});
