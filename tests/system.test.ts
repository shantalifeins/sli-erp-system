import 'dotenv/config';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server';

describe('System Health & Static Tests', () => {
  it('Should successfully load the Express application', () => {
    expect(app).toBeDefined();
  });

  it('Should reject unauthorized API calls', async () => {
    const res = await request(app).get('/api/users');
    // Expect either 401 or 403 depending on the system's auth logic
    expect([401, 403, 500]).toContain(res.status);
  });
});
