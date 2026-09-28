import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../src/shared/middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { uid: 'user-uid-123', role: 'Super Admin', companyId: 'company-uuid-111' };
    next();
  }
}));

vi.mock('../src/shared/middleware/checkPlugin.js', () => ({
  checkPlugin: () => (_req: any, _res: any, next: any) => next()
}));

// ─── Shared mock state ────────────────────────────────────────────────────────
const mockDbSelect = vi.fn();
const mockDbInsert = vi.fn();
const mockDbUpdate = vi.fn();
const mockDbDelete = vi.fn();
const mockDbSelectForCount = vi.fn(); // separate fn for count() queries

/**
 * Build a fully-chained Drizzle-like mock that handles both patterns:
 *  A) .select().from().leftJoin().where().orderBy()  → GET /locations list
 *  B) .select().from().where()                       → count() child check  
 */
vi.mock('../src/shared/db/index.js', () => ({
  db: {
    select: () => ({
      from: () => ({
        // Pattern A: with leftJoin (GET /locations list query)
        leftJoin: () => ({
          where: () => ({
            orderBy: () => Promise.resolve(mockDbSelect())
          })
        }),
        // Pattern B: direct where (count child check)
        where: () => Promise.resolve(mockDbSelectForCount())
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

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('Asset Location API — Full CRUD & Validation', () => {
  let app: express.Express;
  const tenantId = 'company-uuid-111';

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/assets', assetsRouter);
  });

  // ── GET /locations ──────────────────────────────────────────────────────────

  describe('GET /api/assets/locations', () => {
    it('✅ returns empty array when no locations exist', async () => {
      mockDbSelect.mockReturnValue([]);
      const res = await request(app)
        .get('/api/assets/locations')
        .set('x-tenant-id', tenantId);

      expect(res.status).toBe(200);
      expect(res.body.locations).toEqual([]);
    });

    it('✅ returns locations with branchName (two entries — parent + child)', async () => {
      mockDbSelect.mockReturnValue([
        {
          id: 'loc-1', companyId: tenantId, branchId: 1,
          branchName: 'Dhaka HQ', parentId: null,
          name: 'Head Office', description: null, status: 'Active'
        },
        {
          id: 'loc-2', companyId: tenantId, branchId: 1,
          branchName: 'Dhaka HQ', parentId: 'loc-1',
          name: "CEO's Office", description: null, status: 'Active'
        }
      ]);

      const res = await request(app)
        .get('/api/assets/locations')
        .set('x-tenant-id', tenantId);

      expect(res.status).toBe(200);
      expect(res.body.locations).toHaveLength(2);
      expect(res.body.locations[0].name).toBe('Head Office');
      expect(res.body.locations[1].parentId).toBe('loc-1');
    });
  });

  // ── POST /locations ─────────────────────────────────────────────────────────

  describe('POST /api/assets/locations', () => {
    it('✅ creates a top-level location (no parentId)', async () => {
      const newLoc = { id: 'loc-10', companyId: tenantId, branchId: 2, parentId: null, name: 'Ctg Branch', status: 'Active' };
      mockDbInsert.mockReturnValue([newLoc]);

      const res = await request(app)
        .post('/api/assets/locations')
        .set('x-tenant-id', tenantId)
        .send({ branchId: 2, name: 'Ctg Branch' });

      expect(res.status).toBe(201);
      expect(res.body.location.name).toBe('Ctg Branch');
      expect(res.body.location.parentId).toBeNull();
    });

    it('✅ creates a sub-location with parentId', async () => {
      const sub = { id: 'loc-11', companyId: tenantId, parentId: 'loc-1', name: 'Kitchen', status: 'Active' };
      mockDbInsert.mockReturnValue([sub]);

      const res = await request(app)
        .post('/api/assets/locations')
        .set('x-tenant-id', tenantId)
        .send({ parentId: 'loc-1', name: 'Kitchen' });

      expect(res.status).toBe(201);
      expect(res.body.location.parentId).toBe('loc-1');
      expect(res.body.location.name).toBe('Kitchen');
    });

    it('❌ rejects when name is empty string', async () => {
      const res = await request(app)
        .post('/api/assets/locations')
        .set('x-tenant-id', tenantId)
        .send({ name: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Location name is required');
    });

    it('❌ rejects when name field is missing', async () => {
      const res = await request(app)
        .post('/api/assets/locations')
        .set('x-tenant-id', tenantId)
        .send({ branchId: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Location name is required');
    });

    it('✅ trims whitespace from name before saving', async () => {
      mockDbInsert.mockReturnValue([{ id: 'loc-12', name: 'Clean Name', status: 'Active' }]);

      const res = await request(app)
        .post('/api/assets/locations')
        .set('x-tenant-id', tenantId)
        .send({ name: '  Clean Name  ' });

      expect(res.status).toBe(201);
      expect(res.body.location.name).toBe('Clean Name');
    });
  });

  // ── PUT /locations/:id ──────────────────────────────────────────────────────

  describe('PUT /api/assets/locations/:id', () => {
    it('✅ updates name and description', async () => {
      mockDbUpdate.mockReturnValue([{ id: 'loc-1', name: 'Updated', description: '5th floor', status: 'Active' }]);

      const res = await request(app)
        .put('/api/assets/locations/loc-1')
        .set('x-tenant-id', tenantId)
        .send({ name: 'Updated', description: '5th floor' });

      expect(res.status).toBe(200);
      expect(res.body.location.name).toBe('Updated');
      expect(res.body.location.description).toBe('5th floor');
    });

    it('✅ updates status to Inactive', async () => {
      mockDbUpdate.mockReturnValue([{ id: 'loc-1', status: 'Inactive' }]);

      const res = await request(app)
        .put('/api/assets/locations/loc-1')
        .set('x-tenant-id', tenantId)
        .send({ status: 'Inactive' });

      expect(res.status).toBe(200);
      expect(res.body.location.status).toBe('Inactive');
    });

    it('❌ returns 404 when location does not exist', async () => {
      mockDbUpdate.mockReturnValue([]); // empty array = not found

      const res = await request(app)
        .put('/api/assets/locations/ghost-id')
        .set('x-tenant-id', tenantId)
        .send({ name: 'Ghost' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Asset location not found');
    });
  });

  // ── DELETE /locations/:id ───────────────────────────────────────────────────

  describe('DELETE /api/assets/locations/:id', () => {
    it('✅ deletes a leaf location (no children)', async () => {
      mockDbSelectForCount.mockReturnValue([{ count: 0 }]);
      mockDbDelete.mockReturnValue([{ id: 'loc-leaf' }]);

      const res = await request(app)
        .delete('/api/assets/locations/loc-leaf')
        .set('x-tenant-id', tenantId);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Location deleted successfully');
    });

    it('❌ blocks deletion when sub-locations exist', async () => {
      mockDbSelectForCount.mockReturnValue([{ count: 3 }]); // 3 children

      const res = await request(app)
        .delete('/api/assets/locations/loc-parent')
        .set('x-tenant-id', tenantId);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot delete a location that has sub-locations');
    });

    it('❌ returns 404 when location does not exist', async () => {
      mockDbSelectForCount.mockReturnValue([{ count: 0 }]);
      mockDbDelete.mockReturnValue([]); // nothing deleted

      const res = await request(app)
        .delete('/api/assets/locations/ghost-id')
        .set('x-tenant-id', tenantId);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Asset location not found');
    });
  });

  // ── Validation edge cases ───────────────────────────────────────────────────

  describe('Input Validation Edge Cases', () => {
    it('✅ accepts branchId=null (General location, no branch)', async () => {
      mockDbInsert.mockReturnValue([{ id: 'loc-13', branchId: null, name: 'General Storage', status: 'Active' }]);

      const res = await request(app)
        .post('/api/assets/locations')
        .set('x-tenant-id', tenantId)
        .send({ name: 'General Storage', branchId: null });

      expect(res.status).toBe(201);
      expect(res.body.location.branchId).toBeNull();
    });

    it('✅ status defaults to Active when not provided', async () => {
      mockDbInsert.mockReturnValue([{ id: 'loc-14', name: 'Lobby', status: 'Active' }]);

      const res = await request(app)
        .post('/api/assets/locations')
        .set('x-tenant-id', tenantId)
        .send({ name: 'Lobby' });

      expect(res.status).toBe(201);
      expect(res.body.location.status).toBe('Active');
    });
  });
});
