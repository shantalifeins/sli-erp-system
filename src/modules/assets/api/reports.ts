import { Router } from 'express';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth.js';
import { checkPlugin } from '../../../shared/middleware/checkPlugin.js';
import { db } from '../../../shared/db/index.js';
import { resolveTenantId } from '../../../shared/lib/tenant.js';
import { assets, asset_categories, asset_depreciation_schedule, branches, departments, warehouses, users } from '../../../shared/db/schema.js';
import { eq, and, desc, sql, ilike, or, count, sum } from 'drizzle-orm';

const router = Router();

// ==========================================
// ASSET MANAGEMENT REPORTS API
// ==========================================

// GET /api/assets/reports/register — Asset Register Detailed Report
router.get('/register', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { categoryId, branchId, departmentId, status, search } = req.query;

    const conditions = [eq(assets.companyId, companyId)];

    if (categoryId && typeof categoryId === 'string') {
      conditions.push(eq(assets.categoryId, categoryId));
    }
    if (branchId && !isNaN(Number(branchId))) {
      conditions.push(eq(assets.branchId, Number(branchId)));
    }
    if (departmentId && !isNaN(Number(departmentId))) {
      conditions.push(eq(assets.departmentId, Number(departmentId)));
    }
    if (status && typeof status === 'string') {
      conditions.push(eq(assets.status, status));
    }
    if (search && typeof search === 'string' && search.trim() !== '') {
      const s = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(assets.name, s),
          ilike(assets.assetCode, s),
          ilike(assets.serialNumber, s)
        )!
      );
    }

    const registerData = await db
      .select({
        id: assets.id,
        assetCode: assets.assetCode,
        name: assets.name,
        categoryName: asset_categories.name,
        branchName: branches.name,
        departmentName: departments.name,
        custodianName: users.name,
        acquisitionDate: assets.acquisitionDate,
        acquisitionCost: assets.acquisitionCost,
        salvageValue: assets.salvageValue,
        usefulLifeMonths: assets.usefulLifeMonths,
        accumulatedDepreciation: assets.accumulatedDepreciation,
        currentBookValue: assets.currentBookValue,
        status: assets.status,
        sourceType: assets.sourceType,
        serialNumber: assets.serialNumber
      })
      .from(assets)
      .leftJoin(asset_categories, eq(assets.categoryId, asset_categories.id))
      .leftJoin(branches, eq(assets.branchId, branches.id))
      .leftJoin(departments, eq(assets.departmentId, departments.id))
      .leftJoin(users, eq(assets.custodianUid, users.uid))
      .where(and(...conditions))
      .orderBy(desc(assets.createdAt));

    return res.json({ register: registerData, count: registerData.length });
  } catch (error: any) {
    console.error('GET /api/assets/reports/register error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate Asset Register report' });
  }
});

// GET /api/assets/reports/depreciation — Period-wise Depreciation Summary
router.get('/depreciation', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { status, assetId, categoryId } = req.query;

    const conditions = [eq(asset_depreciation_schedule.companyId, companyId)];

    if (status && typeof status === 'string') {
      conditions.push(eq(asset_depreciation_schedule.status, status));
    }
    if (assetId && typeof assetId === 'string') {
      conditions.push(eq(asset_depreciation_schedule.assetId, assetId));
    }

    const scheduleList = await db
      .select({
        id: asset_depreciation_schedule.id,
        assetId: asset_depreciation_schedule.assetId,
        assetCode: assets.assetCode,
        assetName: assets.name,
        categoryName: asset_categories.name,
        periodNumber: asset_depreciation_schedule.periodNumber,
        periodDate: asset_depreciation_schedule.periodDate,
        depreciationAmount: asset_depreciation_schedule.depreciationAmount,
        accumulatedDepreciation: asset_depreciation_schedule.accumulatedDepreciation,
        bookValueAfter: asset_depreciation_schedule.bookValueAfter,
        status: asset_depreciation_schedule.status
      })
      .from(asset_depreciation_schedule)
      .leftJoin(assets, eq(asset_depreciation_schedule.assetId, assets.id))
      .leftJoin(asset_categories, eq(assets.categoryId, asset_categories.id))
      .where(and(...conditions))
      .orderBy(asset_depreciation_schedule.periodDate);

    const totalPosted = scheduleList
      .filter(s => s.status === 'Posted')
      .reduce((acc, s) => acc + Number(s.depreciationAmount || 0), 0);

    const totalScheduled = scheduleList
      .filter(s => s.status === 'Scheduled')
      .reduce((acc, s) => acc + Number(s.depreciationAmount || 0), 0);

    return res.json({
      schedule: scheduleList,
      summary: {
        totalPosted: totalPosted.toFixed(2),
        totalScheduled: totalScheduled.toFixed(2),
        totalPeriods: scheduleList.length
      }
    });
  } catch (error: any) {
    console.error('GET /api/assets/reports/depreciation error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate Depreciation report' });
  }
});

// GET /api/assets/reports/valuation — Valuation Summary & Breakdown
router.get('/valuation', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const allAssets = await db
      .select({
        id: assets.id,
        categoryId: assets.categoryId,
        categoryName: asset_categories.name,
        branchId: assets.branchId,
        branchName: branches.name,
        acquisitionCost: assets.acquisitionCost,
        accumulatedDepreciation: assets.accumulatedDepreciation,
        currentBookValue: assets.currentBookValue,
        status: assets.status
      })
      .from(assets)
      .leftJoin(asset_categories, eq(assets.categoryId, asset_categories.id))
      .leftJoin(branches, eq(assets.branchId, branches.id))
      .where(eq(assets.companyId, companyId));

    let totalAcquisitionCost = 0;
    let totalAccumulatedDepreciation = 0;
    let totalNetBookValue = 0;

    const categoryMap: Record<string, { categoryName: string; count: number; cost: number; accum: number; nbv: number }> = {};
    const branchMap: Record<string, { branchName: string; count: number; cost: number; nbv: number }> = {};

    for (const a of allAssets) {
      const cost = Number(a.acquisitionCost || 0);
      const accum = Number(a.accumulatedDepreciation || 0);
      const nbv = Number(a.currentBookValue || 0);

      totalAcquisitionCost += cost;
      totalAccumulatedDepreciation += accum;
      totalNetBookValue += nbv;

      // Category breakdown
      const catKey = a.categoryName || 'Uncategorized';
      if (!categoryMap[catKey]) {
        categoryMap[catKey] = { categoryName: catKey, count: 0, cost: 0, accum: 0, nbv: 0 };
      }
      categoryMap[catKey].count += 1;
      categoryMap[catKey].cost += cost;
      categoryMap[catKey].accum += accum;
      categoryMap[catKey].nbv += nbv;

      // Branch breakdown
      const brKey = a.branchName || 'Head Office / Unassigned';
      if (!branchMap[brKey]) {
        branchMap[brKey] = { branchName: brKey, count: 0, cost: 0, nbv: 0 };
      }
      branchMap[brKey].count += 1;
      branchMap[brKey].cost += cost;
      branchMap[brKey].nbv += nbv;
    }

    return res.json({
      summary: {
        totalAssetsCount: allAssets.length,
        totalAcquisitionCost: totalAcquisitionCost.toFixed(2),
        totalAccumulatedDepreciation: totalAccumulatedDepreciation.toFixed(2),
        totalNetBookValue: totalNetBookValue.toFixed(2)
      },
      byCategory: Object.values(categoryMap).map(c => ({
        ...c,
        cost: c.cost.toFixed(2),
        accum: c.accum.toFixed(2),
        nbv: c.nbv.toFixed(2)
      })),
      byBranch: Object.values(branchMap).map(b => ({
        ...b,
        cost: b.cost.toFixed(2),
        nbv: b.nbv.toFixed(2)
      }))
    });
  } catch (error: any) {
    console.error('GET /api/assets/reports/valuation error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate Valuation report' });
  }
});

export default router;
