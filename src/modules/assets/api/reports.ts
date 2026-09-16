import { Router } from 'express';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth.js';
import { checkPlugin } from '../../../shared/middleware/checkPlugin.js';
import { db } from '../../../shared/db/index.js';
import { resolveTenantId } from '../../../shared/lib/tenant.js';
import { assets, asset_categories, asset_depreciation_schedule, asset_disposals, branches, departments, warehouses, users } from '../../../shared/db/schema.js';

import { eq, and, desc, sql, ilike, or, count, sum, gte, lte } from 'drizzle-orm';

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
        depreciationMethod: assets.depreciationMethod,
        decliningRate: assets.decliningRate,
        accumulatedDepreciation: assets.accumulatedDepreciation,
        currentBookValue: assets.currentBookValue,
        status: assets.status,
        sourceType: assets.sourceType,
        serialNumber: assets.serialNumber,
        warrantyExpiryDate: assets.warrantyExpiryDate,
        nextMaintenanceDue: assets.nextMaintenanceDue
      })
      .from(assets)
      .leftJoin(asset_categories, eq(assets.categoryId, asset_categories.id))
      .leftJoin(branches, eq(assets.branchId, branches.id))
      .leftJoin(departments, eq(assets.departmentId, departments.id))
      .leftJoin(users, eq(assets.custodianUid, users.uid))
      .where(and(...conditions))
      .orderBy(desc(assets.createdAt));

    const enrichedRegister = registerData.map(item => {
      const cost = Number(item.acquisitionCost || 0);
      const accum = Number(item.accumulatedDepreciation || 0);
      const depreciationPercent = cost > 0 ? Number(((accum / cost) * 100).toFixed(2)) : 0;
      return {
        ...item,
        depreciationPercent
      };
    });

    return res.json({ register: enrichedRegister, count: enrichedRegister.length });
  } catch (error: any) {
    console.error('GET /api/assets/reports/register error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate Asset Register report' });
  }
});

// GET /api/assets/reports/alerts — Warranty & Maintenance Expiration Alerts + Branch Summary
router.get('/alerts', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const allAssets = await db
      .select({
        id: assets.id,
        assetCode: assets.assetCode,
        name: assets.name,
        categoryId: assets.categoryId,
        categoryName: asset_categories.name,
        branchId: assets.branchId,
        branchName: branches.name,
        custodianName: users.name,
        departmentName: departments.name,
        acquisitionCost: assets.acquisitionCost,
        currentBookValue: assets.currentBookValue,
        warrantyExpiryDate: assets.warrantyExpiryDate,
        nextMaintenanceDue: assets.nextMaintenanceDue,
        status: assets.status
      })
      .from(assets)
      .leftJoin(asset_categories, eq(assets.categoryId, asset_categories.id))
      .leftJoin(branches, eq(assets.branchId, branches.id))
      .leftJoin(departments, eq(assets.departmentId, departments.id))
      .leftJoin(users, eq(assets.custodianUid, users.uid))
      .where(and(eq(assets.companyId, companyId), eq(assets.status, 'Active')));

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const warrantyAlerts: any[] = [];
    const maintenanceAlerts: any[] = [];

    let expiredWarrantyCount = 0;
    let expiringSoonWarrantyCount = 0;
    let overdueMaintenanceCount = 0;
    let dueSoonMaintenanceCount = 0;

    const branchSummaryMap: Record<string, {
      branchId: number | null;
      branchName: string;
      totalAssets: number;
      totalCost: number;
      totalNetBookValue: number;
      warrantyAlertsCount: number;
      maintenanceAlertsCount: number;
    }> = {};

    for (const a of allAssets) {
      const brKey = a.branchName || 'Head Office / Unassigned';
      if (!branchSummaryMap[brKey]) {
        branchSummaryMap[brKey] = {
          branchId: a.branchId,
          branchName: brKey,
          totalAssets: 0,
          totalCost: 0,
          totalNetBookValue: 0,
          warrantyAlertsCount: 0,
          maintenanceAlertsCount: 0
        };
      }
      const br = branchSummaryMap[brKey];
      br.totalAssets += 1;
      br.totalCost += Number(a.acquisitionCost || 0);
      br.totalNetBookValue += Number(a.currentBookValue || 0);

      let isWarrantyAlert = false;
      let isMaintenanceAlert = false;

      // Warranty Check
      if (a.warrantyExpiryDate) {
        const wDate = new Date(a.warrantyExpiryDate);
        const diffTime = wDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let alertLevel: 'critical' | 'warning' | 'ok' = 'ok';
        let alertStatus = 'Valid';

        if (diffDays < 0) {
          alertLevel = 'critical';
          alertStatus = 'Expired';
          expiredWarrantyCount++;
          isWarrantyAlert = true;
        } else if (diffDays <= 30) {
          alertLevel = 'warning';
          alertStatus = 'Expiring Soon';
          expiringSoonWarrantyCount++;
          isWarrantyAlert = true;
        }

        warrantyAlerts.push({
          id: a.id,
          assetCode: a.assetCode,
          name: a.name,
          categoryName: a.categoryName,
          branchName: a.branchName,
          custodianName: a.custodianName,
          warrantyExpiryDate: a.warrantyExpiryDate,
          daysRemaining: diffDays,
          alertStatus,
          alertLevel
        });
      }

      // Maintenance Check
      if (a.nextMaintenanceDue) {
        const mDate = new Date(a.nextMaintenanceDue);
        const diffTime = mDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let alertLevel: 'critical' | 'warning' | 'ok' = 'ok';
        let alertStatus = 'OK';

        if (diffDays < 0) {
          alertLevel = 'critical';
          alertStatus = 'Overdue';
          overdueMaintenanceCount++;
          isMaintenanceAlert = true;
        } else if (diffDays <= 7) {
          alertLevel = 'warning';
          alertStatus = 'Maintenance Due';
          dueSoonMaintenanceCount++;
          isMaintenanceAlert = true;
        }

        maintenanceAlerts.push({
          id: a.id,
          assetCode: a.assetCode,
          name: a.name,
          categoryName: a.categoryName,
          branchName: a.branchName,
          custodianName: a.custodianName,
          nextMaintenanceDue: a.nextMaintenanceDue,
          daysRemaining: diffDays,
          alertStatus,
          alertLevel
        });
      }

      if (isWarrantyAlert) br.warrantyAlertsCount += 1;
      if (isMaintenanceAlert) br.maintenanceAlertsCount += 1;
    }

    const branchSummary = Object.values(branchSummaryMap).map(b => ({
      ...b,
      totalCost: b.totalCost.toFixed(2),
      totalNetBookValue: b.totalNetBookValue.toFixed(2)
    }));

    return res.json({
      summary: {
        totalWarrantyAlerts: expiredWarrantyCount + expiringSoonWarrantyCount,
        expiredWarrantyCount,
        expiringSoonWarrantyCount,
        totalMaintenanceAlerts: overdueMaintenanceCount + dueSoonMaintenanceCount,
        overdueMaintenanceCount,
        dueSoonMaintenanceCount
      },
      warrantyAlerts: warrantyAlerts.sort((a, b) => a.daysRemaining - b.daysRemaining),
      maintenanceAlerts: maintenanceAlerts.sort((a, b) => a.daysRemaining - b.daysRemaining),
      branchSummary
    });
  } catch (error: any) {
    console.error('GET /api/assets/reports/alerts error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate Asset Alerts report' });
  }
});

// GET /api/assets/reports/depreciation — Period-wise & Month-range Depreciation Summary
router.get('/depreciation', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { status, assetId, categoryId, search, startMonth, endMonth } = req.query;

    const conditions = [eq(asset_depreciation_schedule.companyId, companyId)];

    if (status && typeof status === 'string') {
      conditions.push(eq(asset_depreciation_schedule.status, status));
    }
    if (assetId && typeof assetId === 'string') {
      conditions.push(eq(asset_depreciation_schedule.assetId, assetId));
    }
    if (categoryId && typeof categoryId === 'string') {
      conditions.push(eq(assets.categoryId, categoryId));
    }
    if (search && typeof search === 'string' && search.trim() !== '') {
      const s = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(assets.name, s),
          ilike(assets.assetCode, s),
          ilike(asset_categories.name, s)
        )!
      );
    }

    if (startMonth && typeof startMonth === 'string' && startMonth.trim() !== '') {
      const startDateStr = startMonth.length === 7 ? `${startMonth}-01` : startMonth;
      const startDate = new Date(`${startDateStr}T00:00:00.000Z`);
      if (!isNaN(startDate.getTime())) {
        conditions.push(gte(asset_depreciation_schedule.periodDate, startDate));
      }
    }

    if (endMonth && typeof endMonth === 'string' && endMonth.trim() !== '') {
      let endDate: Date;
      if (endMonth.length === 7) {
        const [yearStr, monthStr] = endMonth.split('-');
        const yr = parseInt(yearStr, 10);
        const mo = parseInt(monthStr, 10);
        endDate = new Date(Date.UTC(yr, mo, 0, 23, 59, 59, 999));
      } else {
        endDate = new Date(`${endMonth}T23:59:59.999Z`);
      }
      if (!isNaN(endDate.getTime())) {
        conditions.push(lte(asset_depreciation_schedule.periodDate, endDate));
      }
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


// ==========================================
// DEPRECIATION SUMMARY REPORT
// GET /api/assets/reports/depr-summary
// Params: startMonth (YYYY-MM), endMonth (YYYY-MM), categoryId?, branchId?
// ==========================================
router.get('/depr-summary', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { startMonth, endMonth, categoryId, branchId } = req.query;
    if (!startMonth || !endMonth) {
      return res.status(400).json({ error: 'startMonth and endMonth are required (YYYY-MM)' });
    }

    const startDate = new Date(`${startMonth}-01T00:00:00.000Z`);
    // Last millisecond of endMonth
    const [endY, endM] = (endMonth as string).split('-').map(Number);
    const endDate = new Date(Date.UTC(endY, endM, 0, 23, 59, 59, 999)); // last day of endMonth

    // Build asset conditions
    const assetConditions: any[] = [eq(assets.companyId, companyId)];
    if (categoryId && typeof categoryId === 'string') {
      assetConditions.push(eq(assets.categoryId, categoryId));
    }
    if (branchId && !isNaN(Number(branchId))) {
      assetConditions.push(eq(assets.branchId, Number(branchId)));
    }

    // Fetch all matching assets with category info
    const allAssets = await db
      .select({
        id: assets.id,
        acquisitionDate: assets.acquisitionDate,
        acquisitionCost: assets.acquisitionCost,
        accumulatedDepreciation: assets.accumulatedDepreciation,
        currentBookValue: assets.currentBookValue,
        depreciationMethod: assets.depreciationMethod,
        usefulLifeMonths: assets.usefulLifeMonths,
        decliningRate: assets.decliningRate,
        salvageValue: assets.salvageValue,
        status: assets.status,
        categoryId: assets.categoryId,
        categoryName: asset_categories.name,
        categoryDefaultMethod: asset_categories.defaultDepreciationMethod,
        categoryUsefulLife: asset_categories.defaultUsefulLifeMonths,
        categoryDecliningRate: asset_categories.defaultDecliningRate,
      })
      .from(assets)
      .leftJoin(asset_categories, eq(assets.categoryId, asset_categories.id))
      .where(and(...assetConditions));

    // Fetch Posted schedule rows within period (for deprCharge and per-asset opening dep calculation)
    const scheduleInPeriod = await db
      .select({
        assetId: asset_depreciation_schedule.assetId,
        periodDate: asset_depreciation_schedule.periodDate,
        depreciationAmount: asset_depreciation_schedule.depreciationAmount,
        accumulatedDepreciation: asset_depreciation_schedule.accumulatedDepreciation,
        bookValueAfter: asset_depreciation_schedule.bookValueAfter,
        status: asset_depreciation_schedule.status,
      })
      .from(asset_depreciation_schedule)
      .innerJoin(assets, eq(asset_depreciation_schedule.assetId, assets.id))
      .where(
        and(
          eq(asset_depreciation_schedule.companyId, companyId),
          eq(asset_depreciation_schedule.status, 'Posted'),
          gte(asset_depreciation_schedule.periodDate, startDate),
          lte(asset_depreciation_schedule.periodDate, endDate),
          ...(categoryId && typeof categoryId === 'string' ? [eq(assets.categoryId, categoryId)] : []),
          ...(branchId && !isNaN(Number(branchId)) ? [eq(assets.branchId, Number(branchId))] : []),
        )
      );

    // Fetch last Posted schedule row BEFORE startDate per asset (for opening dep balance)
    const scheduleBeforePeriod = await db
      .select({
        assetId: asset_depreciation_schedule.assetId,
        accumulatedDepreciation: asset_depreciation_schedule.accumulatedDepreciation,
        periodDate: asset_depreciation_schedule.periodDate,
      })
      .from(asset_depreciation_schedule)
      .innerJoin(assets, eq(asset_depreciation_schedule.assetId, assets.id))
      .where(
        and(
          eq(asset_depreciation_schedule.companyId, companyId),
          eq(asset_depreciation_schedule.status, 'Posted'),
          sql`${asset_depreciation_schedule.periodDate} < ${startDate}`,
          ...(categoryId && typeof categoryId === 'string' ? [eq(assets.categoryId, categoryId)] : []),
          ...(branchId && !isNaN(Number(branchId)) ? [eq(assets.branchId, Number(branchId))] : []),
        )
      )
      .orderBy(desc(asset_depreciation_schedule.periodDate));

    // Build a map: assetId -> latest accumulatedDepreciation before start
    const openingDepMap: Record<string, number> = {};
    for (const row of scheduleBeforePeriod) {
      if (!(row.assetId in openingDepMap)) {
        openingDepMap[row.assetId] = Number(row.accumulatedDepreciation || 0);
      }
    }


    const disposalsInPeriod = await db

      .select({
        assetId: asset_disposals.assetId,
        disposalDate: asset_disposals.disposalDate,
        bookValueAtDisposal: asset_disposals.bookValueAtDisposal,
        status: asset_disposals.status,
      })
      .from(asset_disposals)
      .where(
        and(
          eq(asset_disposals.companyId, companyId),
          or(
            eq(asset_disposals.status, 'Approved'),
            eq(asset_disposals.status, 'Completed')
          ),
          gte(asset_disposals.disposalDate, startDate),
          lte(asset_disposals.disposalDate, endDate),
        )
      );

    const disposedAssetIds = new Set(disposalsInPeriod.map(d => d.assetId));

    // Map schedule rows by assetId for quick lookup
    const scheduleInPeriodByAsset: Record<string, typeof scheduleInPeriod> = {};
    for (const s of scheduleInPeriod) {
      if (!scheduleInPeriodByAsset[s.assetId]) scheduleInPeriodByAsset[s.assetId] = [];
      scheduleInPeriodByAsset[s.assetId].push(s);
    }

    // Group by category
    interface CatRow {
      categoryId: string;
      categoryName: string;
      ratePercent: number;
      costOpeningBal: number;
      costAddition: number;
      costDisposal: number;
      costClosingBal: number;
      deprOpeningBal: number;
      deprCharge: number;
      deprWrittenOff: number;
      deprClosingBal: number;
      wdv: number;
    }

    const catMap: Record<string, CatRow> = {};

    for (const a of allAssets) {
      const catKey = a.categoryId || 'uncategorized';
      const catName = a.categoryName || 'Uncategorized';
      if (!catMap[catKey]) {
        // Compute rate
        let ratePercent = 0;
        const method = a.depreciationMethod || a.categoryDefaultMethod || 'Straight Line';
        const dr = Number(a.decliningRate || a.categoryDecliningRate || 0);
        const life = Number(a.usefulLifeMonths || a.categoryUsefulLife || 0);
        if (method === 'Declining Balance') {
          ratePercent = dr > 0 ? dr : (life > 0 ? Number(((1 / (life / 12)) * 100).toFixed(2)) : 0);
        } else {
          ratePercent = life > 0 ? Number(((1 / (life / 12)) * 100).toFixed(2)) : 0;
        }

        catMap[catKey] = {
          categoryId: catKey,
          categoryName: catName,
          ratePercent,
          costOpeningBal: 0,
          costAddition: 0,
          costDisposal: 0,
          costClosingBal: 0,
          deprOpeningBal: 0,
          deprCharge: 0,
          deprWrittenOff: 0,
          deprClosingBal: 0,
          wdv: 0,
        };
      }

      const cat = catMap[catKey];
      const acqDate = a.acquisitionDate ? new Date(a.acquisitionDate) : null;
      const acqCost = Number(a.acquisitionCost || 0);
      const isDisposedInPeriod = disposedAssetIds.has(a.id);

      // Cost
      if (acqDate && acqDate < startDate) {
        cat.costOpeningBal += acqCost;
      } else if (acqDate && acqDate >= startDate && acqDate <= endDate) {
        cat.costAddition += acqCost;
      }

      if (isDisposedInPeriod) {
        cat.costDisposal += acqCost;
      }

      // Opening depreciation
      const openingDep = openingDepMap[a.id] ?? (
        // Fallback: if no schedule before period, derive from current accum minus in-period charges
        Number(a.accumulatedDepreciation || 0) -
        (scheduleInPeriodByAsset[a.id] || []).reduce((sum, s) => sum + Number(s.depreciationAmount || 0), 0)
      );
      if (acqDate && acqDate < startDate) {
        cat.deprOpeningBal += Math.max(0, openingDep);
      }

      // Charge in period
      const chargeInPeriod = (scheduleInPeriodByAsset[a.id] || [])
        .reduce((sum, s) => sum + Number(s.depreciationAmount || 0), 0);
      cat.deprCharge += chargeInPeriod;

      // Written off (dep on disposed assets)
      if (isDisposedInPeriod) {
        const disp = disposalsInPeriod.find(d => d.assetId === a.id);
        const bvAtDisposal = disp ? Number(disp.bookValueAtDisposal || 0) : 0;
        cat.deprWrittenOff += Math.max(0, acqCost - bvAtDisposal);
      }
    }

    // Compute closing balances
    const rows: CatRow[] = [];
    const totals: CatRow = {
      categoryId: 'totals',
      categoryName: 'Total',
      ratePercent: 0,
      costOpeningBal: 0, costAddition: 0, costDisposal: 0, costClosingBal: 0,
      deprOpeningBal: 0, deprCharge: 0, deprWrittenOff: 0, deprClosingBal: 0,
      wdv: 0,
    };

    for (const cat of Object.values(catMap)) {
      cat.costClosingBal = cat.costOpeningBal + cat.costAddition - cat.costDisposal;
      cat.deprClosingBal = cat.deprOpeningBal + cat.deprCharge - cat.deprWrittenOff;
      cat.wdv = cat.costClosingBal - cat.deprClosingBal;
      rows.push(cat);

      totals.costOpeningBal += cat.costOpeningBal;
      totals.costAddition += cat.costAddition;
      totals.costDisposal += cat.costDisposal;
      totals.costClosingBal += cat.costClosingBal;
      totals.deprOpeningBal += cat.deprOpeningBal;
      totals.deprCharge += cat.deprCharge;
      totals.deprWrittenOff += cat.deprWrittenOff;
      totals.deprClosingBal += cat.deprClosingBal;
      totals.wdv += cat.wdv;
    }

    // Round totals
    const roundRow = (r: CatRow) => ({
      ...r,
      costOpeningBal: Number(r.costOpeningBal.toFixed(2)),
      costAddition: Number(r.costAddition.toFixed(2)),
      costDisposal: Number(r.costDisposal.toFixed(2)),
      costClosingBal: Number(r.costClosingBal.toFixed(2)),
      deprOpeningBal: Number(r.deprOpeningBal.toFixed(2)),
      deprCharge: Number(r.deprCharge.toFixed(2)),
      deprWrittenOff: Number(r.deprWrittenOff.toFixed(2)),
      deprClosingBal: Number(r.deprClosingBal.toFixed(2)),
      wdv: Number(r.wdv.toFixed(2)),
    });

    return res.json({
      rows: rows.map(roundRow),
      totals: roundRow(totals),
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      }
    });
  } catch (error: any) {
    console.error('GET /api/assets/reports/depr-summary error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate Summary Depreciation report' });
  }
});

// ==========================================
// DEPRECIATION DETAILED REPORT
// GET /api/assets/reports/depr-detailed
// Params: startMonth (YYYY-MM), endMonth (YYYY-MM), categoryId?, branchId?
// ==========================================
router.get('/depr-detailed', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { startMonth, endMonth, categoryId, branchId } = req.query;
    if (!startMonth || !endMonth) {
      return res.status(400).json({ error: 'startMonth and endMonth are required (YYYY-MM)' });
    }

    const startDate = new Date(`${startMonth}-01T00:00:00.000Z`);
    const [endY, endM] = (endMonth as string).split('-').map(Number);
    const endDate = new Date(Date.UTC(endY, endM, 0, 23, 59, 59, 999));
    const endDateStr = endDate.toISOString().split('T')[0];
    const startDateStr = startDate.toISOString().split('T')[0];

    // Build asset conditions
    const assetConditions: any[] = [eq(assets.companyId, companyId)];
    if (categoryId && typeof categoryId === 'string') {
      assetConditions.push(eq(assets.categoryId, categoryId));
    }
    if (branchId && !isNaN(Number(branchId))) {
      assetConditions.push(eq(assets.branchId, Number(branchId)));
    }

    const allAssets = await db
      .select({
        id: assets.id,
        assetCode: assets.assetCode,
        name: assets.name,
        acquisitionDate: assets.acquisitionDate,
        acquisitionCost: assets.acquisitionCost,
        accumulatedDepreciation: assets.accumulatedDepreciation,
        currentBookValue: assets.currentBookValue,
        depreciationMethod: assets.depreciationMethod,
        usefulLifeMonths: assets.usefulLifeMonths,
        decliningRate: assets.decliningRate,
        categoryId: assets.categoryId,
        categoryName: asset_categories.name,
        categoryDefaultMethod: asset_categories.defaultDepreciationMethod,
        categoryUsefulLife: asset_categories.defaultUsefulLifeMonths,
        categoryDecliningRate: asset_categories.defaultDecliningRate,
      })
      .from(assets)
      .leftJoin(asset_categories, eq(assets.categoryId, asset_categories.id))
      .where(and(...assetConditions))
      .orderBy(asset_categories.name, assets.name);

    // Fetch Posted schedule rows within period
    const scheduleInPeriod = await db
      .select({
        assetId: asset_depreciation_schedule.assetId,
        periodNumber: asset_depreciation_schedule.periodNumber,
        periodDate: asset_depreciation_schedule.periodDate,
        depreciationAmount: asset_depreciation_schedule.depreciationAmount,
        accumulatedDepreciation: asset_depreciation_schedule.accumulatedDepreciation,
        bookValueAfter: asset_depreciation_schedule.bookValueAfter,
      })
      .from(asset_depreciation_schedule)
      .innerJoin(assets, eq(asset_depreciation_schedule.assetId, assets.id))
      .where(
        and(
          eq(asset_depreciation_schedule.companyId, companyId),
          eq(asset_depreciation_schedule.status, 'Posted'),
          gte(asset_depreciation_schedule.periodDate, startDate),
          lte(asset_depreciation_schedule.periodDate, endDate),
          ...(categoryId && typeof categoryId === 'string' ? [eq(assets.categoryId, categoryId)] : []),
          ...(branchId && !isNaN(Number(branchId)) ? [eq(assets.branchId, Number(branchId))] : []),
        )
      )
      .orderBy(asset_depreciation_schedule.periodDate, asset_depreciation_schedule.assetId);

    // Fetch last Posted schedule row BEFORE startDate per asset
    const scheduleBeforePeriod = await db
      .select({
        assetId: asset_depreciation_schedule.assetId,
        accumulatedDepreciation: asset_depreciation_schedule.accumulatedDepreciation,
        bookValueAfter: asset_depreciation_schedule.bookValueAfter,
        periodDate: asset_depreciation_schedule.periodDate,
      })
      .from(asset_depreciation_schedule)
      .innerJoin(assets, eq(asset_depreciation_schedule.assetId, assets.id))
      .where(
        and(
          eq(asset_depreciation_schedule.companyId, companyId),
          eq(asset_depreciation_schedule.status, 'Posted'),
          sql`${asset_depreciation_schedule.periodDate} < ${startDate}`,
          ...(categoryId && typeof categoryId === 'string' ? [eq(assets.categoryId, categoryId)] : []),
          ...(branchId && !isNaN(Number(branchId)) ? [eq(assets.branchId, Number(branchId))] : []),
        )
      )
      .orderBy(desc(asset_depreciation_schedule.periodDate));

    const openingDepMap: Record<string, number> = {};
    const openingBvMap: Record<string, number> = {};
    for (const row of scheduleBeforePeriod) {
      if (!(row.assetId in openingDepMap)) {
        openingDepMap[row.assetId] = Number(row.accumulatedDepreciation || 0);
        openingBvMap[row.assetId] = Number(row.bookValueAfter || 0);
      }
    }

    // Build schedule lookup by assetId
    const scheduleByAsset: Record<string, typeof scheduleInPeriod> = {};
    for (const s of scheduleInPeriod) {
      if (!scheduleByAsset[s.assetId]) scheduleByAsset[s.assetId] = [];
      scheduleByAsset[s.assetId].push(s);
    }

    // Group assets by category
    const catGroups: Record<string, typeof allAssets> = {};
    for (const a of allAssets) {
      const key = a.categoryId || 'uncategorized';
      if (!catGroups[key]) catGroups[key] = [];
      catGroups[key].push(a);
    }

    interface DetailRow {
      rowType: 'opening' | 'charge';
      categoryId: string;
      categoryName: string;
      assetId?: string;
      assetCode?: string;
      assetName?: string;
      date: string;
      description: string;
      opening: number;
      addition: number;
      accDep: number;
      netCost: number;
      yearEnd: string;
      rate: number;
      depreciation: number;
    }

    const rows: DetailRow[] = [];
    const totals = { opening: 0, netCost: 0, depreciation: 0 };

    for (const [catId, catAssets] of Object.entries(catGroups)) {
      const catName = catAssets[0]?.categoryName || 'Uncategorized';

      // ---- Opening Balance Row (synthetic, per category) ----
      let openingCostSum = 0;
      let openingDepSum = 0;

      for (const a of catAssets) {
        const acqDate = a.acquisitionDate ? new Date(a.acquisitionDate) : null;
        const acqCost = Number(a.acquisitionCost || 0);
        if (acqDate && acqDate < startDate) {
          openingCostSum += acqCost;
          const od = openingDepMap[a.id];
          if (od !== undefined) {
            openingDepSum += od;
          } else {
            // fallback: current accum minus in-period
            const inPeriodCharge = (scheduleByAsset[a.id] || [])
              .reduce((s, r) => s + Number(r.depreciationAmount || 0), 0);
            openingDepSum += Math.max(0, Number(a.accumulatedDepreciation || 0) - inPeriodCharge);
          }
        }
      }

      const openingNetCost = openingCostSum - openingDepSum;

      rows.push({
        rowType: 'opening',
        categoryId: catId,
        categoryName: catName,
        date: startDateStr,
        description: 'Opening balance',
        opening: openingCostSum,
        addition: 0,
        accDep: openingDepSum,
        netCost: openingNetCost,
        yearEnd: startDateStr,
        rate: 0,
        depreciation: 0,
      });

      totals.opening += openingCostSum;
      totals.netCost += openingNetCost;

      // ---- Charge Rows per asset ----
      for (const a of catAssets) {
        const schedRows = scheduleByAsset[a.id] || [];
        const acqDate = a.acquisitionDate ? new Date(a.acquisitionDate) : null;
        const acqCost = Number(a.acquisitionCost || 0);
        const isAdditionInPeriod = acqDate && acqDate >= startDate && acqDate <= endDate;

        // Compute rate
        const method = a.depreciationMethod || a.categoryDefaultMethod || 'Straight Line';
        const dr = Number(a.decliningRate || a.categoryDecliningRate || 0);
        const life = Number(a.usefulLifeMonths || a.categoryUsefulLife || 0);
        let ratePercent = 0;
        if (method === 'Declining Balance') {
          ratePercent = dr > 0 ? dr : (life > 0 ? Number(((1 / (life / 12)) * 100).toFixed(4)) : 0);
        } else {
          ratePercent = life > 0 ? Number(((1 / (life / 12)) * 100).toFixed(4)) : 0;
        }

        for (const s of schedRows) {
          const depAmt = Number(s.depreciationAmount || 0);
          const accDep = Number(s.accumulatedDepreciation || 0);
          const opening = isAdditionInPeriod ? 0 : acqCost;
          const addition = isAdditionInPeriod ? acqCost : 0;
          const netCost = acqCost - accDep + depAmt; // netCost before this charge = bookValueBefore

          rows.push({
            rowType: 'charge',
            categoryId: catId,
            categoryName: catName,
            assetId: a.id,
            assetCode: a.assetCode || '',
            assetName: a.name,
            date: (s.periodDate instanceof Date ? s.periodDate.toISOString().split('T')[0] : String(s.periodDate || '')), 
            description: `Depreciation Charge – ${a.assetCode || a.name}`,
            opening,
            addition,
            accDep,
            netCost: Number(s.bookValueAfter || 0),
            yearEnd: endDateStr,
            rate: ratePercent,
            depreciation: depAmt,
          });

          totals.depreciation += depAmt;
        }
      }
    }

    return res.json({
      rows,
      totals: {
        opening: Number(totals.opening.toFixed(2)),
        netCost: Number(totals.netCost.toFixed(2)),
        depreciation: Number(totals.depreciation.toFixed(2)),
      },
      period: {
        startDate: startDateStr,
        endDate: endDateStr,
      }
    });
  } catch (error: any) {
    console.error('GET /api/assets/reports/depr-detailed error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate Detailed Depreciation report' });
  }
});

export default router;

