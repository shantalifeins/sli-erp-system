import { Request, Response, NextFunction } from 'express';
import WebSocket from 'ws';
if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = WebSocket;
}
import { createClient } from '@supabase/supabase-js';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import jwtPkg from 'jsonwebtoken';
const jwt = (jwtPkg as any).default || jwtPkg;

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'placeholder_key';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

export interface AuthRequest extends Request {
  user?: any;
  tenantId?: string; // added to keep resolved tenant throughout request
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Try Authorization header first
  let token: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split('Bearer ')[1];
  } else if (req.headers.cookie) {
    // Look for supabase-auth-token cookie (default name used by supabase-js)
    const match = req.headers.cookie.match(/sb\-access-token=([^;]+)/);
    if (match) token = decodeURIComponent(match[1]);
  }

  if (!token || token === 'undefined' || token === 'null') {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  try {
    let user;
    
    // First try offline verification if we have secrets (works for native JWT tokens, SSO tokens, and Supabase tokens)
    const secretsToTry = Array.from(new Set([
      process.env.JWT_SECRET,
      process.env.SUPABASE_JWT_SECRET,
      process.env.VITE_SUPABASE_ANON_KEY,
      'sli_erp_secret_key_2026'
    ].filter(Boolean))) as string[];

    for (const secret of secretsToTry) {
      try {
        const decoded = jwt.verify(token, secret) as any;
        if (decoded && (decoded.sub || decoded.uid)) {
          user = { id: decoded.sub || decoded.uid, email: decoded.email };
          break;
        }
      } catch (jwtErr) {
        // try next secret
      }
    }

    if (!user) {
      // If AUTH_MODE is postgres or Supabase is unconfigured/unreachable, do not make network calls to Supabase API
      if (process.env.AUTH_MODE === 'postgres' || !process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL.includes('placeholder')) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token signature' });
      }
      try {
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data?.user) {
          throw error || new Error('User not found');
        }
        user = data.user;
      } catch (sbErr) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }
    }
    
    const dbUserResult = await db.select().from(users).where(eq(users.uid, user.id)).limit(1);
    const dbUser = dbUserResult[0];
    if (dbUser && dbUser.status === 'Inactive') {
      return res.status(403).json({ error: 'Access Denied: Your account is suspended.' });
    }

    req.user = { 
      uid: user.id, 
      email: user.email,
      companyId: dbUser?.companyId,
      role: dbUser?.role
    };
    // Preserve tenant context – prefer explicit header, otherwise fallback to DB value
    const headerTenant = req.headers['x-tenant-id'] as string;
    req.tenantId = headerTenant || (dbUser as any)?.companyId || undefined;
    next();
  } catch (error: any) {
    console.warn('Auth token verification failed:', error?.message || error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
