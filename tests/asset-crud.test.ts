import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock requireAuth middleware
vi.mock('../src/shared/middleware/auth.js', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { uid: 'user-uid-123', role: 'Super Admin', companyId: 'company-uuid-111' };
    next();
  }
}));

// Mock checkPlugin middleware
vi.mock('../src/shared/middleware/checkPlugin.js', () => ({
  checkPlugin: () => (req: any, res: any, next: any) => next()
}));

// Mock db
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
          limit: () => ({
            offset: () => Promise.resolve(mockDbSelect())
          }),
          returning: () => Promise.resolve(mockDbSelect())
        }),
        leftJoin: () => ({
          leftJoin: () => ({
            leftJoin: () => ({
              leftJoin: () => ({
                where: () => ({
                  orderBy: () => ({
                    limit: () => ({
                      offset: () => Promise.resolve(mockDbSelect())
                    })
                  }),
                  limit: () => Promise.resolve(mockDbSelect())
                })
              })
            })
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
        where: () => ({
          returning: () => Promise.resolve(mockDbUpdate())
        })
      })
    }),
    delete: () => ({
      where: () => ({
        returning: () => Promise.resolve(mockDbDelete())
      })
    })
  }
}));

import assetsRouter from '../src/modules/assets/api/routes.js';

describe('Asset Management — Phase 2 API Router & Tenant Isolation', () => {
  let app: express.Express;
  const testCompanyId = 'company-uuid-111';

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/assets', assetsRouter);
  });

  describe('Asset Categories API', () => {
    it('should create an asset category', async () => {
      const mockCategory = {
        id: 'cat-uuid-1',
        companyId: testCompanyId,
        name: 'IT Equipment',
        code: 'CAT-IT',
        defaultDepreciationMethod: 'Straight Line',
        defaultUsefulLifeMonths: 36,
        defaultSalvagePercent: '0.00',
        status: 'Active'
      };
      mockDbInsert.mockReturnValue([mockCategory]);

      const res = await request(app)
        .post('/api/assets/categories')
        .set('x-tenant-id', testCompanyId)
        .send({
          name: 'IT Equipment',
          code: 'CAT-IT',
          defaultDepreciationMethod: 'Straight Line',
          defaultUsefulLifeMonths: 36
        });

      expect(res.status).toBe(201);
      expect(res.body.category).toBeDefined();
      expect(res.body.category.name).toBe('IT Equipment');
      expect(res.body.category.code).toBe('CAT-IT');
    });

    it('should reject category creation without name or code', async () => {
      const res = await request(app)
        .post('/api/assets/categories')
        .set('x-tenant-id', testCompanyId)
        .send({
          name: ''
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Category name and code are required');
    });

    it('should list categories for tenant', async () => {
      mockDbSelect.mockReturnValue([
        { id: 'cat-1', name: 'IT Equipment', code: 'CAT-IT', companyId: testCompanyId }
      ]);

      const res = await request(app)
        .get('/api/assets/categories')
        .set('x-tenant-id', testCompanyId);

      expect(res.status).toBe(200);
      expect(res.body.categories.length).toBe(1);
      expect(res.body.categories[0].code).toBe('CAT-IT');
    });

    it('should update an asset category', async () => {
      const mockUpdated = {
        id: 'cat-1',
        name: 'Updated IT Equipment',
        code: 'CAT-IT-UPDATED'
      };
      mockDbUpdate.mockReturnValue([mockUpdated]);

      const res = await request(app)
        .put('/api/assets/categories/cat-1')
        .set('x-tenant-id', testCompanyId)
        .send({
          name: 'Updated IT Equipment',
          code: 'CAT-IT-UPDATED'
        });

      expect(res.status).toBe(200);
      expect(res.body.category.name).toBe('Updated IT Equipment');
    });
  });

  describe('Fixed Assets API & Code Generator', () => {
    it('should create an asset with auto-generated AST-YYYYMMDD-XXXX code', async () => {
      // Mock existing count = 0
      mockDbSelect.mockReturnValueOnce([{ count: 0 }]);

      const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const expectedCode = `AST-${datePrefix}-0001`;

      const mockAsset = {
        id: 'asset-uuid-100',
        companyId: testCompanyId,
        assetCode: expectedCode,
        name: 'MacBook Pro M3',
        categoryId: 'cat-1',
        acquisitionCost: '250000.00',
        currentBookValue: '250000',
        status: 'Active'
      };
      mockDbInsert.mockReturnValue([mockAsset]);

      const res = await request(app)
        .post('/api/assets')
        .set('x-tenant-id', testCompanyId)
        .send({
          name: 'MacBook Pro M3',
          categoryId: 'cat-1',
          acquisitionCost: '250000.00'
        });

      expect(res.status).toBe(201);
      expect(res.body.asset.assetCode).toBe(expectedCode);
      expect(res.body.asset.currentBookValue).toBe('250000');
    });

    it('should reject asset creation when missing required fields', async () => {
      const res = await request(app)
        .post('/api/assets')
        .set('x-tenant-id', testCompanyId)
        .send({
          name: 'MacBook Pro M3'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Asset name, categoryId, and acquisitionCost are required');
    });
  });
});
