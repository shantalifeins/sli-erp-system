import { Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { plugins, company_plugins } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { AuthRequest } from './auth.js';

export const checkPlugin = (pluginSlug: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Get companyId strictly from the authenticated tenant context — NO fallback
      const companyId = req.tenantId;

      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: "No company context found. Please select a company or log in again.",
        });
      }

      // Query to check if the plugin is active for the given company
      const activePlugin = await db
        .select()
        .from(company_plugins)
        .innerJoin(plugins, eq(company_plugins.pluginId, plugins.id))
        .where(
          and(
            eq(company_plugins.companyId, companyId),
            eq(plugins.slug, pluginSlug),
            eq(company_plugins.status, 'active')
          )
        );

      if (activePlugin.length === 0) {
        return res.status(403).json({
          success: false,
          message: "This module is not activated for your company.",
        });
      }

      next();
    } catch (error) {
      console.error(`Error verifying plugin access [${pluginSlug}]:`, error);
      res.status(500).json({
        success: false,
        message: "Internal server error during plugin verification.",
      });
    }
  };
};
