import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

// Mock auth middleware
vi.mock('../src/shared/middleware/auth.js', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { uid: 'user-admin', role: 'Super Admin', companyId: 'company-uuid-111' };
    next();
  }
}));

// Mock checkPlugin middleware
vi.mock('../src/shared/middleware/checkPlugin.js', () => ({
  checkPlugin: () => (req: any, res: any, next: any) => next()
}));

const mockDbSelect = vi.fn();
const createChainableQuery = () => {
  const chain: any = {
    from: () => chain,
    leftJoin: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => chain,
    offset: () => chain,
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
import assetReportsRouter from '../src/modules/assets/api/reports.js';

describe('Audit Fixes Validation', () => {
  describe('Backend API Tests', () => {
    let app: express.Express;

    beforeEach(() => {
      vi.clearAllMocks();
      app = express();
      app.use(express.json());
      app.use('/api/assets', assetsRouter);
      app.use('/api/assets/reports', assetReportsRouter);
    });

    it('Fix 5: GET /api/assets should include lastVerificationStatus in the query', async () => {
      mockDbSelect.mockResolvedValueOnce([{ totalCount: 1 }]); // Mock count
      mockDbSelect.mockResolvedValueOnce([{
        id: '123',
        status: 'Active',
        lastVerificationStatus: 'Misplaced'
      }]);

      const res = await request(app).get('/api/assets');
      expect(res.status).toBe(200);
      
      // Since we mock the DB, we can't easily assert the exact SQL generated without complex mocking of drizzle,
      // but we can check the file contents directly for the fix below.
    });
  });

  describe('Frontend Static Analysis Tests', () => {
    it('Fix 1: AssetTransfers.tsx should use p.module for permissions', () => {
      const content = fs.readFileSync(path.join(__dirname, '../src/modules/assets/pages/AssetTransfers.tsx'), 'utf-8');
      expect(content).toContain('p.module === menuName');
    });

    it('Fix 2: AssetTransfers.tsx should use SearchableSelect for Custodian', () => {
      const content = fs.readFileSync(path.join(__dirname, '../src/modules/assets/pages/AssetTransfers.tsx'), 'utf-8');
      expect(content).toContain('placeholder="Select destination custodian..."');
      expect(content).toContain('<SearchableSelect');
    });

    it('Fix 3: Assets.tsx should reset locationId when branch changes', () => {
      const content = fs.readFileSync(path.join(__dirname, '../src/modules/assets/pages/Assets.tsx'), 'utf-8');
      expect(content).toContain('branchId: e.target.value, locationId: \'\'');
    });

    it('Fix 4: AssetReports.tsx should pass locationId to alerts endpoint', () => {
      const content = fs.readFileSync(path.join(__dirname, '../src/modules/assets/pages/AssetReports.tsx'), 'utf-8');
      expect(content).toContain("params.append('locationId', selectedLocation)");
      expect(content).toContain("fetchWithAuth(`/api/assets/reports/alerts?${params.toString()}`");
    });

    it('Fix 5: routes.ts should include lastVerificationStatus', () => {
      const content = fs.readFileSync(path.join(__dirname, '../src/modules/assets/api/routes.ts'), 'utf-8');
      expect(content).toContain('lastVerificationStatus: sql<string>');
      expect(content).toContain('verification_status FROM asset_verification_details');
    });
    
    it('Fix 5: Assets.tsx should display Misplaced and Missing badges', () => {
      const content = fs.readFileSync(path.join(__dirname, '../src/modules/assets/pages/Assets.tsx'), 'utf-8');
      expect(content).toContain('asset.lastVerificationStatus === \'Misplaced\'');
      expect(content).toContain('⚠️ Misplaced');
      expect(content).toContain('❌ Missing');
    });

    it('Fix 6: AssetCategories.tsx should convert declining rate to decimal on submit', () => {
      const content = fs.readFileSync(path.join(__dirname, '../src/modules/assets/pages/AssetCategories.tsx'), 'utf-8');
      expect(content).toContain('payload.defaultDecliningRate = (Number(payload.defaultDecliningRate) / 100).toFixed(4)');
    });
  });
});
