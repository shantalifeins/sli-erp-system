import { NextFunction, Response } from 'express';
import { AuthRequest } from './auth.js';
import { db } from '../db/index.js';
import { role_permissions, audit_logs } from '../db/schema.js';
import { and, eq } from 'drizzle-orm';
import { resolveTenantId } from '../lib/tenant.js';

// Simple in-memory cache: key = `${companyId}:${role}`, value = { perms, expiresAt }
const permCache = new Map<string, { perms: any[], expiresAt: number }>();
const CACHE_TTL_MS = 60000; // 60s

export const invalidatePermCache = (companyId: string, role: string) => {
  permCache.delete(`${companyId}:${role}`);
};

const loadPermissions = async (companyId: string, role: string) => {
  const key = `${companyId}:${role}`;
  const cached = permCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.perms;
  }

  const perms = await db
    .select()
    .from(role_permissions)
    .where(and(eq(role_permissions.companyId, companyId), eq(role_permissions.role, role)));

  permCache.set(key, { perms, expiresAt: Date.now() + CACHE_TTL_MS });
  return perms;
};

export const requirePermission = (
  menu: string,
  action: 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'canApprove'
) => async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userRole = req.user?.role;
    if (!userRole) {
      return res.status(401).json({ error: 'Unauthorized: User role not found' });
    }

    // Super Admin bypasses permission checks
    if (userRole === 'Super Admin') {
      return next();
    }

    const companyId = await resolveTenantId(req);
    if (!companyId) {
      return res.status(403).json({ error: 'Forbidden: Company context required' });
    }

    const perms = await loadPermissions(companyId, userRole);
    const perm = perms.find(p => p.module === menu);

    if (!perm || !perm[action]) {
      if (action === 'canApprove' || action === 'canDelete') {
        // Log unauthorized high-privilege attempts
        await db.insert(audit_logs).values({
          uid: req.user!.uid,
          action: 'Unauthorized Access Attempt',
          entity: menu,
          entityId: 'N/A',
          details: { message: `Attempted to ${action} without permission`, companyId, ip: req.ip || 'Unknown' },
        });
      }
      return res.status(403).json({ error: `Forbidden: requires ${menu}.${action}` });
    }

    next();
  } catch (error) {
    console.error('Permission check error:', error);
    res.status(500).json({ error: 'Failed to verify permissions' });
  }
};
