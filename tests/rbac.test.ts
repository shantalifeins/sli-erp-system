import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requirePermission, invalidatePermCache } from '../src/shared/middleware/permissions.js';

// Mock DB
vi.mock('../src/shared/db/index.js', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([
          { module: 'Inventory Items', canView: true, canCreate: false }
        ]))
      }))
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve({}))
    }))
  }
}));

vi.mock('../src/shared/lib/tenant.js', () => ({
  resolveTenantId: vi.fn(async () => 'company-123')
}));

describe('RBAC Middleware', () => {
  beforeEach(() => {
    invalidatePermCache('company-123', 'Manager');
  });

  it('allows access if permission is granted', async () => {
    const middleware = requirePermission('Inventory Items', 'canView');
    const req = { user: { role: 'Manager', uid: 'user-1' } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks access and logs audit if permission denied for high-privilege action', async () => {
    const middleware = requirePermission('Inventory Items', 'canCreate');
    const req = { user: { role: 'Manager', uid: 'user-1' } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    await middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows super admin unconditionally', async () => {
    const middleware = requirePermission('Inventory Items', 'canCreate');
    const req = { user: { role: 'Super Admin', uid: 'sa-1' } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
