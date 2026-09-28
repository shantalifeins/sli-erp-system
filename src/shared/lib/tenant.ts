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

  // Fallback to first company in database (e.g. for Super Admin without company_id)
  try {
    const fallbackCompany = await db.select({ id: companies.id }).from(companies).limit(1);
    if (fallbackCompany.length > 0) {
      return fallbackCompany[0].id;
    }
  } catch (err) {
    console.error('resolveTenantId fallback error:', err);
  }

  return undefined;
};

