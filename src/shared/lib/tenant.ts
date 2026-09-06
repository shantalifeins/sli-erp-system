import { Request } from 'express';
import { AuthRequest } from '../middleware/auth.js';

export const resolveTenantId = async (req: AuthRequest | Request): Promise<string | undefined> => {
  // First check header
  const headerTenantId = req.headers['x-tenant-id'];
  if (headerTenantId && typeof headerTenantId === 'string') {
    return headerTenantId;
  }

  if ('user' in req && req.user) {
    if (req.user.company_id) return req.user.company_id;
    if ((req.user as any).companyId) return (req.user as any).companyId;
  }

  return undefined;
};
