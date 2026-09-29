import { Request } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { companies } from '../db/schema.js';

export const resolveTenantId = async (req: AuthRequest | Request): Promise<string | undefined> => {
  // First check header
  const headerTenantId = req.headers['x-tenant-id'];
  if (headerTenantId && typeof headerTenantId === 'string' && headerTenantId !== 'undefined' && headerTenantId !== 'null') {
    return headerTenantId;
  }

  if ('user' in req && req.user) {
    if (req.user.company_id) return req.user.company_id;
    if ((req.user as any).companyId) return (req.user as any).companyId;
  }

  return undefined;
};

export const requireTenant = (companyId: string | undefined, res: any): boolean => {
  if (!companyId) {
    res.status(403).json({ error: 'Tenant context required' });
    return false;
  }
  return true;
};

