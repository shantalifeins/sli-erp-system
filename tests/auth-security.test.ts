import { describe, it, expect } from 'vitest';
import { generateAuthToken, verifyPassword } from '../src/shared/lib/authUtils.js';
import * as crypto from 'crypto';

describe('Auth Security (Phase 0)', () => {
  it('should generate JWT correctly when secrets are set', () => {
    // temporarily mock process.env
    const originalEnv = process.env.VITE_SUPABASE_ANON_KEY;
    process.env.VITE_SUPABASE_ANON_KEY = 'test_secret_for_jwt_only';
    
    try {
      const token = generateAuthToken({ email: 'test@example.com', uid: 'test-uid' });
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20);
    } finally {
      process.env.VITE_SUPABASE_ANON_KEY = originalEnv;
    }
  });

  it('should throw an error if no JWT secrets are present', () => {
    const originalKey1 = process.env.VITE_SUPABASE_ANON_KEY;
    const originalKey2 = process.env.SUPABASE_JWT_SECRET;
    const originalKey3 = process.env.JWT_SECRET;
    
    process.env.VITE_SUPABASE_ANON_KEY = '';
    process.env.SUPABASE_JWT_SECRET = '';
    process.env.JWT_SECRET = '';
    
    try {
      expect(() => {
        generateAuthToken({ email: 'fail@example.com' });
      }).toThrow('JWT_SECRET is not configured');
    } finally {
      process.env.VITE_SUPABASE_ANON_KEY = originalKey1;
      process.env.SUPABASE_JWT_SECRET = originalKey2;
      process.env.JWT_SECRET = originalKey3;
    }
  });
});
