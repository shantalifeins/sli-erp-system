import * as crypto from 'crypto';
import jwtPkg from 'jsonwebtoken';
const jwt = (jwtPkg as any).default || jwtPkg;

/**
 * Hashes a plain-text password using PBKDF2 with a random salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifies a plain-text password against a stored salt:hash string.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

/**
 * Generates a signed JWT token for a user.
 */
export function generateAuthToken(user: { id?: number; uid?: string | null; email: string; companyId?: string | null; role?: string | null }): string {
  const secret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || process.env.VITE_SUPABASE_ANON_KEY || 'sli_erp_secret_key_2026';
  const effectiveUid = user.uid || crypto.randomUUID();
  return jwt.sign(
    {
      sub: effectiveUid,
      uid: effectiveUid,
      email: user.email,
      companyId: user.companyId || null,
      role: user.role || 'Requester'
    },
    secret,
    { expiresIn: '7d' }
  );
}
