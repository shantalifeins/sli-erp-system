import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { generateAuthToken } from '../src/shared/lib/authUtils.js';

describe('Cross-Tenant Security (Phase 0)', () => {
  it('should reject requests without tenant context', async () => {
    // Generate a token but without any company context in the payload and no header
    const token = generateAuthToken({ email: 'nocompany@example.com', uid: 'user-1' });
    
    // Test GRN creation endpoint
    const res = await request(app)
      .post('/api/grn')
      .set('Authorization', `Bearer ${token}`)
      .send({ poId: 1, items: [], warehouseId: 1 });
      
    // Because no companyId is set, it should hit requireTenant which returns 403
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Tenant context required|Company required/i);
  });
});
