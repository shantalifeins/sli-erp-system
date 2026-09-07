import { Router } from 'express';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth.js';
import { checkPlugin } from '../../../shared/middleware/checkPlugin.js';
import { db } from '../../../shared/db/index.js';
import { resolveTenantId } from '../../../shared/lib/tenant.js';
import { asset_categories, assets, asset_depreciation_schedule, asset_transfers, asset_maintenance, asset_disposals, asset_physical_verifications, asset_verification_details, vendors, branches, departments, warehouses, users, document_approvals, inbox_tasks, bpmn_definitions } from '../../../shared/db/schema.js';
import { calculateStraightLineSchedule, calculateDecliningBalanceSchedule } from '../lib/depreciationEngine.js';

import { eq, ne, and, desc, sql, ilike, or, count } from 'drizzle-orm';

const router = Router();

// ==========================================
// 1. ASSET CATEGORIES CRUD
// ==========================================

// GET /api/assets/categories — List categories for tenant
router.get('/categories', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { status } = req.query;

    const conditions = [eq(asset_categories.companyId, companyId)];
    if (status && typeof status === 'string') {
      conditions.push(eq(asset_categories.status, status));
    }

    const categoriesList = await db
      .select()
      .from(asset_categories)
      .where(and(...conditions))
      .orderBy(asset_categories.name);

    return res.json({ categories: categoriesList });
  } catch (error: any) {
    console.error('GET /api/assets/categories error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch asset categories' });
  }
});

// POST /api/assets/categories — Create category
router.post('/categories', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const {
      name,
      code,
      defaultDepreciationMethod,
      defaultUsefulLifeMonths,
      defaultSalvagePercent,
      defaultDecliningRate,
      fixedAssetAccount,
      depreciationAccount,
      expenseAccount,
      status
    } = req.body || {};

    if (!name || !code) {
      return res.status(400).json({ error: 'Category name and code are required' });
    }

    const [newCat] = await db
      .insert(asset_categories)
      .values({
        companyId,
        name,
        code: code.toUpperCase().trim(),
        defaultDepreciationMethod: defaultDepreciationMethod || 'Straight Line',
        defaultUsefulLifeMonths: defaultUsefulLifeMonths ? Number(defaultUsefulLifeMonths) : 36,
        defaultSalvagePercent: defaultSalvagePercent ? String(defaultSalvagePercent) : '0.00',
        defaultDecliningRate: defaultDecliningRate !== undefined ? String(defaultDecliningRate) : '0.00',
        fixedAssetAccount: fixedAssetAccount || null,
        depreciationAccount: depreciationAccount || null,
        expenseAccount: expenseAccount || null,
        status: status || 'Active'
      })
      .returning();

    return res.status(201).json({ category: newCat });
  } catch (error: any) {
    console.error('POST /api/assets/categories error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create asset category' });
  }
});

// PUT /api/assets/categories/:id — Update category
router.put('/categories/:id', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { id } = req.params;
    const {
      name,
      code,
      defaultDepreciationMethod,
      defaultUsefulLifeMonths,
      defaultSalvagePercent,
      defaultDecliningRate,
      fixedAssetAccount,
      depreciationAccount,
      expenseAccount,
      status
    } = req.body || {};

    const [updatedCat] = await db
      .update(asset_categories)
      .set({
        name,
        code: code ? code.toUpperCase().trim() : undefined,
        defaultDepreciationMethod,
        defaultUsefulLifeMonths: defaultUsefulLifeMonths ? Number(defaultUsefulLifeMonths) : undefined,
        defaultSalvagePercent: defaultSalvagePercent !== undefined ? String(defaultSalvagePercent) : undefined,
        defaultDecliningRate: defaultDecliningRate !== undefined ? String(defaultDecliningRate) : undefined,
        fixedAssetAccount,
        depreciationAccount,
        expenseAccount,
        status,
        updatedAt: new Date()
      })
      .where(and(eq(asset_categories.id, id), eq(asset_categories.companyId, companyId)))
      .returning();

    if (!updatedCat) {
      return res.status(404).json({ error: 'Asset category not found' });
    }

    return res.json({ category: updatedCat });
  } catch (error: any) {
    console.error('PUT /api/assets/categories/:id error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update asset category' });
  }
});

// DELETE /api/assets/categories/:id — Delete category
router.delete('/categories/:id', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { id } = req.params;

    // Check if category is linked to existing assets
    const linkedAssets = await db
      .select({ count: count() })
      .from(assets)
      .where(and(eq(assets.categoryId, id), eq(assets.companyId, companyId)));

    if (linkedAssets[0]?.count > 0) {
      return res.status(400).json({ error: 'Cannot delete category that is currently linked to assets' });
    }

    const [deleted] = await db
      .delete(asset_categories)
      .where(and(eq(asset_categories.id, id), eq(asset_categories.companyId, companyId)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Category not found' });
    }

    return res.json({ message: 'Category deleted successfully' });
  } catch (error: any) {
    console.error('DELETE /api/assets/categories/:id error:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete asset category' });
  }
});

// ==========================================
// 8. PHYSICAL VERIFICATION AUDIT API
// ==========================================

// POST /api/assets/verifications — Start new physical verification audit session
router.post('/verifications', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { branchId, notes } = req.body;

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await db.select({ count: sql`count(*)` }).from(asset_physical_verifications).where(eq(asset_physical_verifications.companyId, companyId));
    const seq = String(Number(count[0].count) + 1).padStart(4, '0');
    const verificationCode = `APV-${dateStr}-${seq}`;

    const [verification] = await db.insert(asset_physical_verifications).values({
      companyId,
      verificationCode,
      branchId: branchId ? Number(branchId) : null,
      notes: notes || null,
      verifiedByUid: req.user!.uid,
      status: 'In-Progress'
    }).returning();

    // Query target assets to populate verification detail lines
    const assetConditions = [eq(assets.companyId, companyId), ne(assets.status, 'Disposed')];
    if (branchId && !isNaN(Number(branchId))) {
      assetConditions.push(eq(assets.branchId, Number(branchId)));
    }

    const targetAssets = await db.select().from(assets).where(and(...assetConditions));

    if (targetAssets.length > 0) {
      const detailRows = targetAssets.map(a => ({
        verificationId: verification.id,
        assetId: a.id,
        expectedBranchId: a.branchId,
        expectedCustodianUid: a.custodianUid,
        condition: 'Good',
        verificationStatus: 'Unverified'
      }));

      await db.insert(asset_verification_details).values(detailRows);
    }

    return res.status(201).json({ verification, totalAssets: targetAssets.length });
  } catch (error: any) {
    console.error('POST /api/assets/verifications error:', error);
    return res.status(500).json({ error: error.message || 'Failed to start physical verification session' });
  }
});

// GET /api/assets/verifications — List verification audit sessions
router.get('/verifications', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const sessions = await db
      .select({
        id: asset_physical_verifications.id,
        verificationCode: asset_physical_verifications.verificationCode,
        branchId: asset_physical_verifications.branchId,
        branchName: branches.name,
        status: asset_physical_verifications.status,
        verificationDate: asset_physical_verifications.verificationDate,
        verifiedByName: users.name,
        totalAssetsCounted: asset_physical_verifications.totalAssetsCounted,
        totalMissing: asset_physical_verifications.totalMissing,
        totalMisplaced: asset_physical_verifications.totalMisplaced,
        notes: asset_physical_verifications.notes,
        createdAt: asset_physical_verifications.createdAt
      })
      .from(asset_physical_verifications)
      .leftJoin(branches, eq(asset_physical_verifications.branchId, branches.id))
      .leftJoin(users, eq(asset_physical_verifications.verifiedByUid, users.uid))
      .where(eq(asset_physical_verifications.companyId, companyId))
      .orderBy(desc(asset_physical_verifications.createdAt));

    return res.json({ verifications: sessions });
  } catch (error: any) {
    console.error('GET /api/assets/verifications error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch verification sessions' });
  }
});

// GET /api/assets/verifications/:id — Get session details & detail items
router.get('/verifications/:id', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { id } = req.params;

    const [session] = await db
      .select({
        id: asset_physical_verifications.id,
        verificationCode: asset_physical_verifications.verificationCode,
        branchId: asset_physical_verifications.branchId,
        branchName: branches.name,
        status: asset_physical_verifications.status,
        verificationDate: asset_physical_verifications.verificationDate,
        verifiedByName: users.name,
        totalAssetsCounted: asset_physical_verifications.totalAssetsCounted,
        totalMissing: asset_physical_verifications.totalMissing,
        totalMisplaced: asset_physical_verifications.totalMisplaced,
        notes: asset_physical_verifications.notes,
        createdAt: asset_physical_verifications.createdAt
      })
      .from(asset_physical_verifications)
      .leftJoin(branches, eq(asset_physical_verifications.branchId, branches.id))
      .leftJoin(users, eq(asset_physical_verifications.verifiedByUid, users.uid))
      .where(and(eq(asset_physical_verifications.id, id), eq(asset_physical_verifications.companyId, companyId)));

    if (!session) return res.status(404).json({ error: 'Verification session not found' });

    const details = await db
      .select({
        id: asset_verification_details.id,
        verificationId: asset_verification_details.verificationId,
        assetId: asset_verification_details.assetId,
        assetCode: assets.assetCode,
        assetName: assets.name,
        serialNumber: assets.serialNumber,
        categoryName: asset_categories.name,
        expectedBranchId: asset_verification_details.expectedBranchId,
        foundBranchId: asset_verification_details.foundBranchId,
        condition: asset_verification_details.condition,
        verificationStatus: asset_verification_details.verificationStatus,
        scannedAt: asset_verification_details.scannedAt,
        notes: asset_verification_details.notes
      })
      .from(asset_verification_details)
      .leftJoin(assets, eq(asset_verification_details.assetId, assets.id))
      .leftJoin(asset_categories, eq(assets.categoryId, asset_categories.id))
      .where(eq(asset_verification_details.verificationId, id));

    return res.json({ session, details });
  } catch (error: any) {
    console.error('GET /api/assets/verifications/:id error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch verification session details' });
  }
});

// PUT /api/assets/verifications/:id/scan — Audit individual detail line
router.post('/verifications/:id/scan', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { id } = req.params;
    const { detailId, assetCode, condition, foundBranchId, foundCustodianUid, notes } = req.body;

    let targetDetailId = detailId;

    if (!targetDetailId && assetCode) {
      const detailMatch = await db
        .select({ id: asset_verification_details.id })
        .from(asset_verification_details)
        .leftJoin(assets, eq(asset_verification_details.assetId, assets.id))
        .where(and(
          eq(asset_verification_details.verificationId, id),
          eq(assets.assetCode, assetCode.trim())
        ))
        .limit(1);

      if (detailMatch.length > 0) {
        targetDetailId = detailMatch[0].id;
      }
    }

    if (!targetDetailId) return res.status(404).json({ error: 'Asset detail record not found in session' });

    const [existingDetail] = await db
      .select()
      .from(asset_verification_details)
      .where(eq(asset_verification_details.id, targetDetailId));

    if (!existingDetail) return res.status(404).json({ error: 'Detail line not found' });

    const expectedBranch = existingDetail.expectedBranchId;
    const foundBranch = foundBranchId ? Number(foundBranchId) : expectedBranch;

    let vStatus = 'Verified';
    if (condition === 'Missing') {
      vStatus = 'Missing';
    } else if (expectedBranch && foundBranch && expectedBranch !== foundBranch) {
      vStatus = 'Misplaced';
    }

    const [updatedDetail] = await db
      .update(asset_verification_details)
      .set({
        foundBranchId: foundBranch,
        foundCustodianUid: foundCustodianUid || null,
        condition: condition || 'Good',
        verificationStatus: vStatus,
        scannedAt: new Date(),
        notes: notes || null
      })
      .where(eq(asset_verification_details.id, targetDetailId))
      .returning();

    // Recalculate session totals
    const sessionDetails = await db
      .select({ status: asset_verification_details.verificationStatus })
      .from(asset_verification_details)
      .where(eq(asset_verification_details.verificationId, id));

    const totalCounted = sessionDetails.filter(d => d.status !== 'Unverified').length;
    const totalMissing = sessionDetails.filter(d => d.status === 'Missing').length;
    const totalMisplaced = sessionDetails.filter(d => d.status === 'Misplaced').length;

    await db
      .update(asset_physical_verifications)
      .set({
        totalAssetsCounted: totalCounted,
        totalMissing: totalMissing,
        totalMisplaced: totalMisplaced
      })
      .where(eq(asset_physical_verifications.id, id));

    return res.json({ detail: updatedDetail, status: vStatus });
  } catch (error: any) {
    console.error('POST /api/assets/verifications/:id/scan error:', error);
    return res.status(500).json({ error: error.message || 'Failed to record asset scan' });
  }
});

// PUT /api/assets/verifications/:id/complete — Complete physical verification session
router.put('/verifications/:id/complete', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { id } = req.params;

    // Mark remaining Unverified items as Missing
    await db
      .update(asset_verification_details)
      .set({ verificationStatus: 'Missing', condition: 'Missing' })
      .where(and(
        eq(asset_verification_details.verificationId, id),
        eq(asset_verification_details.verificationStatus, 'Unverified')
      ));

    // Recalculate final totals
    const sessionDetails = await db
      .select({ status: asset_verification_details.verificationStatus })
      .from(asset_verification_details)
      .where(eq(asset_verification_details.verificationId, id));

    const totalCounted = sessionDetails.length;
    const totalMissing = sessionDetails.filter(d => d.status === 'Missing').length;
    const totalMisplaced = sessionDetails.filter(d => d.status === 'Misplaced').length;

    const [completedSession] = await db
      .update(asset_physical_verifications)
      .set({
        status: 'Completed',
        totalAssetsCounted: totalCounted,
        totalMissing: totalMissing,
        totalMisplaced: totalMisplaced
      })
      .where(and(eq(asset_physical_verifications.id, id), eq(asset_physical_verifications.companyId, companyId)))
      .returning();

    return res.json({ session: completedSession });
  } catch (error: any) {
    console.error('PUT /api/assets/verifications/:id/complete error:', error);
    return res.status(500).json({ error: error.message || 'Failed to complete verification session' });
  }
});

// ==========================================
// 2. FIXED ASSETS CRUD
// ==========================================

// GET /api/assets — List assets with filtering and pagination
router.get('/', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { categoryId, branchId, warehouseId, departmentId, status, search, page = '1', limit = '50' } = req.query;

    const conditions = [eq(assets.companyId, companyId)];

    if (categoryId && typeof categoryId === 'string') {
      conditions.push(eq(assets.categoryId, categoryId));
    }
    if (branchId && !isNaN(Number(branchId))) {
      conditions.push(eq(assets.branchId, Number(branchId)));
    }
    if (warehouseId && !isNaN(Number(warehouseId))) {
      conditions.push(eq(assets.warehouseId, Number(warehouseId)));
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

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Math.min(100, Number(limit) || 50));
    const offset = (pageNum - 1) * limitNum;

    const assetsList = await db
      .select({
        id: assets.id,
        companyId: assets.companyId,
        assetCode: assets.assetCode,
        name: assets.name,
        categoryId: assets.categoryId,
        categoryName: asset_categories.name,
        branchId: assets.branchId,
        branchName: branches.name,
        warehouseId: assets.warehouseId,
        warehouseName: warehouses.name,
        custodianUid: assets.custodianUid,
        custodianName: users.name,
        departmentId: assets.departmentId,
        departmentName: departments.name,
        acquisitionDate: assets.acquisitionDate,
        acquisitionCost: assets.acquisitionCost,
        salvageValue: assets.salvageValue,
        depreciationMethod: assets.depreciationMethod,
        usefulLifeMonths: assets.usefulLifeMonths,
        accumulatedDepreciation: assets.accumulatedDepreciation,
        currentBookValue: assets.currentBookValue,
        status: assets.status,
        sourceType: assets.sourceType,
        sourceGrnId: assets.sourceGrnId,
        serialNumber: assets.serialNumber,
        qrCode: assets.qrCode,
        createdAt: assets.createdAt
      })
      .from(assets)
      .leftJoin(asset_categories, eq(assets.categoryId, asset_categories.id))
      .leftJoin(branches, eq(assets.branchId, branches.id))
      .leftJoin(warehouses, eq(assets.warehouseId, warehouses.id))
      .leftJoin(users, eq(assets.custodianUid, users.uid))
      .leftJoin(departments, eq(assets.departmentId, departments.id))
      .where(and(...conditions))
      .orderBy(desc(assets.createdAt))
      .limit(limitNum)
      .offset(offset);

    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(assets)
      .where(and(...conditions));

    return res.json({
      assets: assetsList,
      pagination: {
        total: Number(totalCount),
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(Number(totalCount) / limitNum)
      }
    });
  } catch (error: any) {
    console.error('GET /api/assets error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch assets' });
  }
});

// GET /api/assets/:id — Get single asset by ID
router.get('/:id', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { id } = req.params;

    const [assetRecord] = await db
      .select({
        id: assets.id,
        companyId: assets.companyId,
        assetCode: assets.assetCode,
        name: assets.name,
        categoryId: assets.categoryId,
        categoryName: asset_categories.name,
        branchId: assets.branchId,
        branchName: branches.name,
        warehouseId: assets.warehouseId,
        warehouseName: warehouses.name,
        custodianUid: assets.custodianUid,
        custodianName: users.name,
        departmentId: assets.departmentId,
        departmentName: departments.name,
        acquisitionDate: assets.acquisitionDate,
        acquisitionCost: assets.acquisitionCost,
        salvageValue: assets.salvageValue,
        depreciationMethod: assets.depreciationMethod,
        usefulLifeMonths: assets.usefulLifeMonths,
        depreciationStartDate: assets.depreciationStartDate,
        accumulatedDepreciation: assets.accumulatedDepreciation,
        currentBookValue: assets.currentBookValue,
        status: assets.status,
        sourceType: assets.sourceType,
        sourceGrnId: assets.sourceGrnId,
        serialNumber: assets.serialNumber,
        qrCode: assets.qrCode,
        createdByUid: assets.createdByUid,
        createdAt: assets.createdAt,
        updatedAt: assets.updatedAt
      })
      .from(assets)
      .leftJoin(asset_categories, eq(assets.categoryId, asset_categories.id))
      .leftJoin(branches, eq(assets.branchId, branches.id))
      .leftJoin(warehouses, eq(assets.warehouseId, warehouses.id))
      .leftJoin(users, eq(assets.custodianUid, users.uid))
      .leftJoin(departments, eq(assets.departmentId, departments.id))
      .where(and(eq(assets.id, id), eq(assets.companyId, companyId)))
      .limit(1);

    if (!assetRecord) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    return res.json({ asset: assetRecord });
  } catch (error: any) {
    console.error('GET /api/assets/:id error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch asset details' });
  }
});

// POST /api/assets — Create asset with auto code generation AST-YYYYMMDD-XXXX
router.post('/', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const {
      name,
      categoryId,
      branchId,
      warehouseId,
      custodianUid,
      departmentId,
      acquisitionDate,
      acquisitionCost,
      salvageValue,
      depreciationMethod,
      decliningRate,
      usefulLifeMonths,
      depreciationStartDate,
      serialNumber,
      sourceType,
      sourceGrnId,
      status
    } = req.body || {};

    if (!name || !categoryId || acquisitionCost === undefined) {
      return res.status(400).json({ error: 'Asset name, categoryId, and acquisitionCost are required' });
    }

    // Auto-code generation: AST-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countRes = await db
      .select({ count: count() })
      .from(assets)
      .where(eq(assets.companyId, companyId));

    const existingCount = countRes && countRes[0] ? Number(countRes[0].count) : 0;
    const seq = String(existingCount + 1).padStart(4, '0');
    const assetCode = `AST-${dateStr}-${seq}`;


    const costNum = Number(acquisitionCost);
    const salvageNum = salvageValue ? Number(salvageValue) : 0;
    const initialBookValue = String(costNum);

    const [newAsset] = await db
      .insert(assets)
      .values({
        companyId,
        assetCode,
        name,
        categoryId,
        branchId: branchId ? Number(branchId) : null,
        warehouseId: warehouseId ? Number(warehouseId) : null,
        custodianUid: custodianUid || null,
        departmentId: departmentId ? Number(departmentId) : null,
        acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : new Date(),
        acquisitionCost: String(costNum),
        salvageValue: String(salvageNum),
        depreciationMethod: depreciationMethod || 'Straight Line',
        decliningRate: decliningRate !== undefined ? String(decliningRate) : '0.00',
        usefulLifeMonths: usefulLifeMonths ? Number(usefulLifeMonths) : 36,
        depreciationStartDate: depreciationStartDate ? new Date(depreciationStartDate) : null,
        accumulatedDepreciation: '0.00',
        currentBookValue: initialBookValue,
        status: status || 'Active',
        sourceType: sourceType || 'Manual',
        sourceGrnId: sourceGrnId ? Number(sourceGrnId) : null,
        serialNumber: serialNumber || null,
        createdByUid: req.user?.uid || null
      })
      .returning();

    return res.status(201).json({ asset: newAsset });
  } catch (error: any) {
    console.error('POST /api/assets error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create asset' });
  }
});

// PUT /api/assets/:id — Update asset details
router.put('/:id', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { id } = req.params;
    const {
      name,
      categoryId,
      branchId,
      warehouseId,
      custodianUid,
      departmentId,
      acquisitionCost,
      salvageValue,
      depreciationMethod,
      decliningRate,
      usefulLifeMonths,
      depreciationStartDate,
      serialNumber,
      status
    } = req.body || {};

    const [existingAsset] = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), eq(assets.companyId, companyId)))
      .limit(1);

    if (!existingAsset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const costNum = acquisitionCost !== undefined ? Number(acquisitionCost) : Number(existingAsset.acquisitionCost);
    const accumNum = Number(existingAsset.accumulatedDepreciation || 0);
    const updatedBookValue = String(costNum - accumNum);

    const [updatedAsset] = await db
      .update(assets)
      .set({
        name,
        categoryId,
        branchId: branchId !== undefined ? (branchId ? Number(branchId) : null) : undefined,
        warehouseId: warehouseId !== undefined ? (warehouseId ? Number(warehouseId) : null) : undefined,
        custodianUid: custodianUid !== undefined ? custodianUid : undefined,
        departmentId: departmentId !== undefined ? (departmentId ? Number(departmentId) : null) : undefined,
        acquisitionCost: acquisitionCost !== undefined ? String(costNum) : undefined,
        salvageValue: salvageValue !== undefined ? String(salvageValue) : undefined,
        depreciationMethod,
        decliningRate: decliningRate !== undefined ? String(decliningRate) : undefined,
        usefulLifeMonths: usefulLifeMonths ? Number(usefulLifeMonths) : undefined,
        depreciationStartDate: depreciationStartDate ? new Date(depreciationStartDate) : undefined,
        currentBookValue: updatedBookValue,
        serialNumber,
        status,
        updatedAt: new Date()
      })
      .where(and(eq(assets.id, id), eq(assets.companyId, companyId)))
      .returning();

    return res.json({ asset: updatedAsset });
  } catch (error: any) {
    console.error('PUT /api/assets/:id error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update asset' });
  }
});

// ==========================================
// 3. DEPRECIATION ENGINE & SCHEDULE WIZARD
// ==========================================

// POST /api/assets/:id/activate — Activate asset and generate depreciation schedule
router.post('/:id/activate', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { id } = req.params;
    const [existingAsset] = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), eq(assets.companyId, companyId)))
      .limit(1);

    if (!existingAsset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (existingAsset.status === 'Active') {
      return res.status(400).json({ error: 'Asset is already Active' });
    }

    const acquisitionCost = Number(existingAsset.acquisitionCost || 0);
    const salvageValue = Number(existingAsset.salvageValue || 0);
    const usefulLifeMonths = Number(existingAsset.usefulLifeMonths || 36);
    const decliningRate = Number(existingAsset.decliningRate || 0);
    const startDate = existingAsset.depreciationStartDate ? new Date(existingAsset.depreciationStartDate) : new Date(existingAsset.acquisitionDate || new Date());

    // Generate schedule periods using chosen method engine
    const scheduleItems = existingAsset.depreciationMethod === 'Declining Balance'
      ? calculateDecliningBalanceSchedule(acquisitionCost, salvageValue, usefulLifeMonths, startDate, decliningRate)
      : calculateStraightLineSchedule(acquisitionCost, salvageValue, usefulLifeMonths, startDate);

    // Delete any existing schedule rows for this asset (re-activation protection)
    await db
      .delete(asset_depreciation_schedule)
      .where(and(eq(asset_depreciation_schedule.assetId, id), eq(asset_depreciation_schedule.companyId, companyId)));

    // Insert new schedule rows
    const dbScheduleRows = scheduleItems.map(item => ({
      companyId,
      assetId: id,
      periodNumber: item.periodNumber,
      periodDate: item.periodDate,
      depreciationAmount: item.depreciationAmount,
      accumulatedDepreciation: item.accumulatedDepreciation,
      bookValueAfter: item.bookValueAfter,
      status: item.status
    }));

    await db.insert(asset_depreciation_schedule).values(dbScheduleRows);

    // Update asset status to Active
    const [activatedAsset] = await db
      .update(assets)
      .set({
        status: 'Active',
        depreciationStartDate: startDate,
        updatedAt: new Date()
      })
      .where(and(eq(assets.id, id), eq(assets.companyId, companyId)))
      .returning();

    return res.json({ asset: activatedAsset, scheduleCount: dbScheduleRows.length });
  } catch (error: any) {
    console.error('POST /api/assets/:id/activate error:', error);
    return res.status(500).json({ error: error.message || 'Failed to activate asset' });
  }
});

// GET /api/assets/:id/schedule — Get depreciation schedule for asset
router.get('/:id/schedule', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { id } = req.params;

    const scheduleList = await db
      .select()
      .from(asset_depreciation_schedule)
      .where(and(eq(asset_depreciation_schedule.assetId, id), eq(asset_depreciation_schedule.companyId, companyId)))
      .orderBy(asset_depreciation_schedule.periodNumber);

    return res.json({ schedule: scheduleList });
  } catch (error: any) {
    console.error('GET /api/assets/:id/schedule error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch asset depreciation schedule' });
  }
});

// POST /api/assets/compute-depreciation — Wizard: Post due depreciation periods
router.post('/compute-depreciation', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { targetDate } = req.body || {};
    const cutoffDate = targetDate ? new Date(targetDate) : new Date();

    // Fetch all Scheduled periods up to cutoffDate for tenant
    const duePeriods = await db
      .select()
      .from(asset_depreciation_schedule)
      .where(
        and(
          eq(asset_depreciation_schedule.companyId, companyId),
          eq(asset_depreciation_schedule.status, 'Scheduled'),
          sql`${asset_depreciation_schedule.periodDate} <= ${cutoffDate}`
        )
      );

    if (duePeriods.length === 0) {
      return res.json({ message: 'No due depreciation periods to post', postedCount: 0 });
    }

    // Mark due periods as Posted
    const dueIds = duePeriods.map(p => p.id);
    await db
      .update(asset_depreciation_schedule)
      .set({ status: 'Posted' })
      .where(
        and(
          eq(asset_depreciation_schedule.companyId, companyId),
          sql`${asset_depreciation_schedule.id} IN (${sql.join(dueIds.map(id => sql`${id}`), sql`, `)})`
        )
      );

    // Group affected assets and recalculate accumulatedDepreciation & currentBookValue
    const affectedAssetIds = Array.from(new Set(duePeriods.map(p => p.assetId)));

    for (const assetId of affectedAssetIds) {
      // Get all Posted rows for asset
      const postedRows = await db
        .select()
        .from(asset_depreciation_schedule)
        .where(
          and(
            eq(asset_depreciation_schedule.assetId, assetId),
            eq(asset_depreciation_schedule.companyId, companyId),
            eq(asset_depreciation_schedule.status, 'Posted')
          )
        );

      const totalAccumulated = postedRows.reduce((sum, r) => sum + Number(r.depreciationAmount || 0), 0);

      const [targetAsset] = await db
        .select()
        .from(assets)
        .where(and(eq(assets.id, assetId), eq(assets.companyId, companyId)))
        .limit(1);

      if (targetAsset) {
        const acqCost = Number(targetAsset.acquisitionCost || 0);
        const salvage = Number(targetAsset.salvageValue || 0);
        const newBookValue = Math.max(salvage, acqCost - totalAccumulated);

        await db
          .update(assets)
          .set({
            accumulatedDepreciation: String(totalAccumulated.toFixed(2)),
            currentBookValue: String(newBookValue.toFixed(2)),
            updatedAt: new Date()
          })
          .where(and(eq(assets.id, assetId), eq(assets.companyId, companyId)));
      }
    }

    return res.json({
      message: `Successfully posted ${duePeriods.length} depreciation periods across ${affectedAssetIds.length} assets`,
      postedCount: duePeriods.length,
      updatedAssetsCount: affectedAssetIds.length
    });
  } catch (error: any) {
    console.error('POST /api/assets/compute-depreciation error:', error);
    return res.status(500).json({ error: error.message || 'Failed to compute depreciation wizard' });
  }
});

// ==========================================
// 4. BPMN WORKFLOW: ASSET ACQUISITION APPROVAL
// ==========================================

// POST /api/assets/:id/submit — Submit asset for approval / activation
router.post('/:id/submit', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { id } = req.params;
    const [assetRecord] = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), eq(assets.companyId, companyId)))
      .limit(1);

    if (!assetRecord) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (assetRecord.status !== 'Draft' && assetRecord.status !== 'Rejected') {
      return res.status(400).json({ error: `Asset cannot be submitted from status '${assetRecord.status}'` });
    }

    // Check for workflow definition
    const [wfDef] = await db
      .select()
      .from(bpmn_definitions)
      .where(and(eq(bpmn_definitions.companyId, companyId), eq(bpmn_definitions.documentType, 'Asset Acquisition')))
      .limit(1);

    if (!wfDef) {
      // Direct activation mode if no workflow is configured
      const acquisitionCost = Number(assetRecord.acquisitionCost || 0);
      const salvageValue = Number(assetRecord.salvageValue || 0);
      const usefulLifeMonths = Number(assetRecord.usefulLifeMonths || 36);
      const startDate = assetRecord.depreciationStartDate ? new Date(assetRecord.depreciationStartDate) : new Date(assetRecord.acquisitionDate || new Date());

      const scheduleItems = assetRecord.depreciationMethod === 'Declining Balance'
        ? calculateDecliningBalanceSchedule(acquisitionCost, salvageValue, usefulLifeMonths, startDate)
        : calculateStraightLineSchedule(acquisitionCost, salvageValue, usefulLifeMonths, startDate);

      await db
        .delete(asset_depreciation_schedule)
        .where(and(eq(asset_depreciation_schedule.assetId, id), eq(asset_depreciation_schedule.companyId, companyId)));

      const dbScheduleRows = scheduleItems.map(item => ({
        companyId,
        assetId: id,
        periodNumber: item.periodNumber,
        periodDate: item.periodDate,
        depreciationAmount: item.depreciationAmount,
        accumulatedDepreciation: item.accumulatedDepreciation,
        bookValueAfter: item.bookValueAfter,
        status: item.status
      }));

      await db.insert(asset_depreciation_schedule).values(dbScheduleRows);

      const [activatedAsset] = await db
        .update(assets)
        .set({
          status: 'Active',
          depreciationStartDate: startDate,
          updatedAt: new Date()
        })
        .where(and(eq(assets.id, id), eq(assets.companyId, companyId)))
        .returning();

      return res.json({
        message: 'No workflow definition found. Asset auto-activated successfully.',
        asset: activatedAsset,
        workflowTriggered: false
      });
    }

    // Workflow exists -> create approval entry & inbox task
    const targetRole = 'Head of Operations';

    const [approvalRecord] = await db
      .insert(document_approvals)
      .values({
        companyId,
        documentType: 'Asset Acquisition',
        documentId: 0,
        stepOrder: 1,
        roleRequired: targetRole,
        assigneeValue: id,
        status: 'Pending'
      })
      .returning();

    await db.insert(inbox_tasks).values({
      companyId,
      category: 'Asset Management',
      referenceType: 'Asset Acquisition',
      referenceId: 0,
      actionLink: id,
      title: `Asset Acquisition Approval: ${assetRecord.name} (${assetRecord.assetCode})`,
      assignedToRole: targetRole,
      assignedToUid: null,
      status: 'Pending'
    });

    const [updatedAsset] = await db
      .update(assets)
      .set({ status: 'PendingApproval', updatedAt: new Date() })
      .where(and(eq(assets.id, id), eq(assets.companyId, companyId)))
      .returning();

    return res.json({
      message: 'Asset submitted for approval successfully.',
      asset: updatedAsset,
      approval: approvalRecord,
      workflowTriggered: true
    });
  } catch (error: any) {
    console.error('POST /api/assets/:id/submit error:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit asset for approval' });
  }
});

// POST /api/assets/:id/approve — Action approval step for asset acquisition
router.post('/:id/approve', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { id } = req.params;
    const { comments } = req.body || {};

    const [assetRecord] = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), eq(assets.companyId, companyId)))
      .limit(1);

    if (!assetRecord) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (assetRecord.status !== 'PendingApproval') {
      return res.status(400).json({ error: 'Asset is not pending approval' });
    }

    // Complete ALL pending inbox tasks for this document reference
    await db
      .update(inbox_tasks)
      .set({ status: 'Completed', actionResult: 'Approved' })
      .where(
        and(
          eq(inbox_tasks.companyId, companyId),
          eq(inbox_tasks.referenceType, 'Asset Acquisition'),
          eq(inbox_tasks.actionLink, id)
        )
      );

    // Update document_approvals status to Approved
    await db
      .update(document_approvals)
      .set({ status: 'Approved', updatedAt: new Date() })
      .where(
        and(
          eq(document_approvals.companyId, companyId),
          eq(document_approvals.documentType, 'Asset Acquisition'),
          eq(document_approvals.assigneeValue, id)
        )
      );

    // Final Approval Step -> Activate Asset & generate depreciation schedule
    const acquisitionCost = Number(assetRecord.acquisitionCost || 0);
    const salvageValue = Number(assetRecord.salvageValue || 0);
    const usefulLifeMonths = Number(assetRecord.usefulLifeMonths || 36);
    const startDate = assetRecord.depreciationStartDate ? new Date(assetRecord.depreciationStartDate) : new Date(assetRecord.acquisitionDate || new Date());

    const scheduleItems = assetRecord.depreciationMethod === 'Declining Balance'
      ? calculateDecliningBalanceSchedule(acquisitionCost, salvageValue, usefulLifeMonths, startDate)
      : calculateStraightLineSchedule(acquisitionCost, salvageValue, usefulLifeMonths, startDate);

    await db
      .delete(asset_depreciation_schedule)
      .where(and(eq(asset_depreciation_schedule.assetId, id), eq(asset_depreciation_schedule.companyId, companyId)));

    const dbScheduleRows = scheduleItems.map(item => ({
      companyId,
      assetId: id,
      periodNumber: item.periodNumber,
      periodDate: item.periodDate,
      depreciationAmount: item.depreciationAmount,
      accumulatedDepreciation: item.accumulatedDepreciation,
      bookValueAfter: item.bookValueAfter,
      status: item.status
    }));

    await db.insert(asset_depreciation_schedule).values(dbScheduleRows);

    const [activatedAsset] = await db
      .update(assets)
      .set({
        status: 'Active',
        depreciationStartDate: startDate,
        updatedAt: new Date()
      })
      .where(and(eq(assets.id, id), eq(assets.companyId, companyId)))
      .returning();

    return res.json({
      message: 'Asset acquisition approved and activated successfully.',
      asset: activatedAsset,
      scheduleCount: dbScheduleRows.length
    });
  } catch (error: any) {
    console.error('POST /api/assets/:id/approve error:', error);
    return res.status(500).json({ error: error.message || 'Failed to approve asset' });
  }
});

// POST /api/assets/:id/reject — Reject asset acquisition request
router.post('/:id/reject', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { id } = req.params;
    const { comments } = req.body || {};

    const [assetRecord] = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), eq(assets.companyId, companyId)))
      .limit(1);

    if (!assetRecord) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Complete ALL pending inbox tasks for this document reference
    await db
      .update(inbox_tasks)
      .set({ status: 'Completed', actionResult: 'Rejected' })
      .where(
        and(
          eq(inbox_tasks.companyId, companyId),
          eq(inbox_tasks.referenceType, 'Asset Acquisition'),
          eq(inbox_tasks.actionLink, id)
        )
      );

    // Update document_approvals status to Rejected
    await db
      .update(document_approvals)
      .set({ status: 'Rejected', updatedAt: new Date() })
      .where(
        and(
          eq(document_approvals.companyId, companyId),
          eq(document_approvals.documentType, 'Asset Acquisition'),
          eq(document_approvals.assigneeValue, id)
        )
      );

    const [rejectedAsset] = await db
      .update(assets)
      .set({ status: 'Draft', updatedAt: new Date() })
      .where(and(eq(assets.id, id), eq(assets.companyId, companyId)))
      .returning();

    return res.json({
      message: 'Asset acquisition rejected and reset to Draft.',
      asset: rejectedAsset
    });
  } catch (error: any) {
    console.error('POST /api/assets/:id/reject error:', error);
    return res.status(500).json({ error: error.message || 'Failed to reject asset' });
  }
});

// ==========================================
// 5. ASSET TRANSFER WORKFLOW & HISTORY
// ==========================================

// POST /api/assets/:id/transfer — Request asset transfer
router.post('/:id/transfer', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { id } = req.params;
    const { toBranchId, toCustodianUid, reason } = req.body || {};

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Reason for transfer is required' });
    }

    const [existingAsset] = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), eq(assets.companyId, companyId)))
      .limit(1);

    if (!existingAsset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Check for workflow definition
    const [wfDef] = await db
      .select()
      .from(bpmn_definitions)
      .where(and(eq(bpmn_definitions.companyId, companyId), eq(bpmn_definitions.documentType, 'Asset Transfer')))
      .limit(1);

    const [transferRecord] = await db
      .insert(asset_transfers)
      .values({
        companyId,
        assetId: id,
        fromBranchId: existingAsset.branchId,
        fromCustodianUid: existingAsset.custodianUid,
        toBranchId: toBranchId ? Number(toBranchId) : null,
        toCustodianUid: toCustodianUid || null,
        reason: reason.trim(),
        status: wfDef ? 'Pending' : 'Approved',
        requestedBy: req.user?.uid || null
      })
      .returning();

    if (!wfDef) {
      // Auto-approve transfer if no workflow is configured
      const [updatedAsset] = await db
        .update(assets)
        .set({
          branchId: toBranchId ? Number(toBranchId) : existingAsset.branchId,
          custodianUid: toCustodianUid || existingAsset.custodianUid,
          updatedAt: new Date()
        })
        .where(and(eq(assets.id, id), eq(assets.companyId, companyId)))
        .returning();

      return res.json({
        message: 'No transfer workflow defined. Asset transferred immediately.',
        transfer: transferRecord,
        asset: updatedAsset,
        workflowTriggered: false
      });
    }

    // Create approval record & inbox task
    const targetRole = 'Head of Operations';
    await db.insert(document_approvals).values({
      companyId,
      documentType: 'Asset Transfer',
      documentId: 0,
      stepOrder: 1,
      roleRequired: targetRole,
      assigneeValue: transferRecord.id,
      status: 'Pending'
    });

    await db.insert(inbox_tasks).values({
      companyId,
      category: 'Asset Management',
      referenceType: 'Asset Transfer',
      referenceId: 0,
      actionLink: transferRecord.id,
      title: `Asset Transfer Request: ${existingAsset.name} (${existingAsset.assetCode})`,
      assignedToRole: targetRole,
      assignedToUid: null,
      status: 'Pending'
    });

    return res.json({
      message: 'Asset transfer request submitted for approval.',
      transfer: transferRecord,
      workflowTriggered: true
    });
  } catch (error: any) {
    console.error('POST /api/assets/:id/transfer error:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit asset transfer' });
  }
});

// GET /api/assets/transfers/:transferId — Get single transfer
router.get('/transfers/:transferId', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { transferId } = req.params;

    const [transferRecord] = await db
      .select({
        id: asset_transfers.id,
        assetId: asset_transfers.assetId,
        fromBranchId: asset_transfers.fromBranchId,
        toBranchId: asset_transfers.toBranchId,
        fromCustodianUid: asset_transfers.fromCustodianUid,
        toCustodianUid: asset_transfers.toCustodianUid,
        reason: asset_transfers.reason,
        status: asset_transfers.status,
        createdAt: asset_transfers.createdAt,
        assetCode: assets.assetCode,
        assetName: assets.name
      })
      .from(asset_transfers)
      .leftJoin(assets, eq(asset_transfers.assetId, assets.id))
      .where(and(eq(asset_transfers.id, transferId), eq(asset_transfers.companyId, companyId)))
      .limit(1);

    if (!transferRecord) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    return res.json(transferRecord);
  } catch (error: any) {
    console.error('GET /api/assets/transfers/:transferId error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch asset transfer' });
  }
});

// POST /api/assets/transfers/:transferId/approve — Approve transfer
router.post('/transfers/:transferId/approve', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { transferId } = req.params;

    const [transferRecord] = await db
      .select()
      .from(asset_transfers)
      .where(and(eq(asset_transfers.id, transferId), eq(asset_transfers.companyId, companyId)))
      .limit(1);

    if (!transferRecord) {
      return res.status(404).json({ error: 'Transfer request not found' });
    }

    if (transferRecord.status !== 'Pending') {
      return res.status(400).json({ error: `Transfer is already in status '${transferRecord.status}'` });
    }

    // Mark inbox tasks as Completed
    await db
      .update(inbox_tasks)
      .set({ status: 'Completed', actionResult: 'Approved' })
      .where(
        and(
          eq(inbox_tasks.companyId, companyId),
          eq(inbox_tasks.referenceType, 'Asset Transfer'),
          eq(inbox_tasks.actionLink, transferId)
        )
      );

    // Update document_approvals status
    await db
      .update(document_approvals)
      .set({ status: 'Approved', updatedAt: new Date() })
      .where(
        and(
          eq(document_approvals.companyId, companyId),
          eq(document_approvals.documentType, 'Asset Transfer'),
          eq(document_approvals.assigneeValue, transferId)
        )
      );

    // Update transfer status
    const [approvedTransfer] = await db
      .update(asset_transfers)
      .set({ status: 'Approved' })
      .where(and(eq(asset_transfers.id, transferId), eq(asset_transfers.companyId, companyId)))
      .returning();

    // Update target asset's branchId & custodianUid
    const [updatedAsset] = await db
      .update(assets)
      .set({
        branchId: approvedTransfer.toBranchId || undefined,
        custodianUid: approvedTransfer.toCustodianUid || undefined,
        updatedAt: new Date()
      })
      .where(and(eq(assets.id, approvedTransfer.assetId), eq(assets.companyId, companyId)))
      .returning();

    return res.json({
      message: 'Asset transfer approved successfully.',
      transfer: approvedTransfer,
      asset: updatedAsset
    });
  } catch (error: any) {
    console.error('POST /api/assets/transfers/:transferId/approve error:', error);
    return res.status(500).json({ error: error.message || 'Failed to approve asset transfer' });
  }
});

// POST /api/assets/transfers/:transferId/reject — Reject transfer
router.post('/transfers/:transferId/reject', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { transferId } = req.params;

    const [transferRecord] = await db
      .select()
      .from(asset_transfers)
      .where(and(eq(asset_transfers.id, transferId), eq(asset_transfers.companyId, companyId)))
      .limit(1);

    if (!transferRecord) {
      return res.status(404).json({ error: 'Transfer request not found' });
    }

    // Mark inbox tasks as Completed
    await db
      .update(inbox_tasks)
      .set({ status: 'Completed', actionResult: 'Rejected' })
      .where(
        and(
          eq(inbox_tasks.companyId, companyId),
          eq(inbox_tasks.referenceType, 'Asset Transfer'),
          eq(inbox_tasks.actionLink, transferId)
        )
      );

    // Update document_approvals status
    await db
      .update(document_approvals)
      .set({ status: 'Rejected', updatedAt: new Date() })
      .where(
        and(
          eq(document_approvals.companyId, companyId),
          eq(document_approvals.documentType, 'Asset Transfer'),
          eq(document_approvals.assigneeValue, transferId)
        )
      );

    const [rejectedTransfer] = await db
      .update(asset_transfers)
      .set({ status: 'Rejected' })
      .where(and(eq(asset_transfers.id, transferId), eq(asset_transfers.companyId, companyId)))
      .returning();

    return res.json({
      message: 'Asset transfer rejected.',
      transfer: rejectedTransfer
    });
  } catch (error: any) {
    console.error('POST /api/assets/transfers/:transferId/reject error:', error);
    return res.status(500).json({ error: error.message || 'Failed to reject asset transfer' });
  }
});

// GET /api/assets/:id/transfers — Get transfer history for asset
router.get('/:id/transfers', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { id } = req.params;

    const transfersList = await db
      .select()
      .from(asset_transfers)
      .where(and(eq(asset_transfers.assetId, id), eq(asset_transfers.companyId, companyId)))
      .orderBy(desc(asset_transfers.createdAt));

    return res.json({ transfers: transfersList });
  } catch (error: any) {
    console.error('GET /api/assets/:id/transfers error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch asset transfer history' });
  }
});

// ==========================================
// 6. ASSET MAINTENANCE TRACKING
// ==========================================

// POST /api/assets/:id/maintenance — Create maintenance record and set asset to UnderMaintenance
router.post('/:id/maintenance', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { id } = req.params;
    const { maintenanceType, vendorId, cost, scheduledDate, notes } = req.body || {};

    if (!maintenanceType || !scheduledDate) {
      return res.status(400).json({ error: 'Maintenance type and scheduled date are required' });
    }

    const [existingAsset] = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), eq(assets.companyId, companyId)))
      .limit(1);

    if (!existingAsset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Check if asset already has an open maintenance record
    const openMaintenance = await db
      .select()
      .from(asset_maintenance)
      .where(
        and(
          eq(asset_maintenance.assetId, id),
          eq(asset_maintenance.companyId, companyId),
          or(eq(asset_maintenance.status, 'Scheduled'), eq(asset_maintenance.status, 'InProgress'))
        )
      )
      .limit(1);

    if (openMaintenance.length > 0) {
      return res.status(400).json({ error: 'Asset already has an active or scheduled maintenance task in progress' });
    }

    // Insert maintenance record
    const [maintenanceRecord] = await db
      .insert(asset_maintenance)
      .values({
        companyId,
        assetId: id,
        maintenanceType,
        vendorId: vendorId ? Number(vendorId) : null,
        cost: cost !== undefined ? String(cost) : '0.00',
        scheduledDate: new Date(scheduledDate),
        notes: notes || null,
        status: 'InProgress'
      })
      .returning();

    // Toggle asset status to UnderMaintenance
    const [updatedAsset] = await db
      .update(assets)
      .set({
        status: 'UnderMaintenance',
        updatedAt: new Date()
      })
      .where(and(eq(assets.id, id), eq(assets.companyId, companyId)))
      .returning();

    return res.status(201).json({
      message: 'Maintenance task logged and asset set to UnderMaintenance.',
      maintenance: maintenanceRecord,
      asset: updatedAsset
    });
  } catch (error: any) {
    console.error('POST /api/assets/:id/maintenance error:', error);
    return res.status(500).json({ error: error.message || 'Failed to log asset maintenance' });
  }
});

// PUT /api/assets/maintenance/:maintenanceId/complete — Complete maintenance and restore asset to Active
router.put('/maintenance/:maintenanceId/complete', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { maintenanceId } = req.params;
    const { nextDueDate, notes, cost } = req.body || {};

    const [existingRecord] = await db
      .select()
      .from(asset_maintenance)
      .where(and(eq(asset_maintenance.id, maintenanceId), eq(asset_maintenance.companyId, companyId)))
      .limit(1);

    if (!existingRecord) {
      return res.status(404).json({ error: 'Maintenance record not found' });
    }

    if (existingRecord.status === 'Completed') {
      return res.status(400).json({ error: 'Maintenance task is already marked as Completed' });
    }

    const [completedRecord] = await db
      .update(asset_maintenance)
      .set({
        status: 'Completed',
        completedDate: new Date(),
        nextDueDate: nextDueDate ? new Date(nextDueDate) : undefined,
        cost: cost !== undefined ? String(cost) : existingRecord.cost,
        notes: notes || existingRecord.notes
      })
      .where(and(eq(asset_maintenance.id, maintenanceId), eq(asset_maintenance.companyId, companyId)))
      .returning();

    // Restore asset status to Active
    const [restoredAsset] = await db
      .update(assets)
      .set({
        status: 'Active',
        updatedAt: new Date()
      })
      .where(and(eq(assets.id, existingRecord.assetId), eq(assets.companyId, companyId)))
      .returning();

    return res.json({
      message: 'Maintenance task completed and asset restored to Active.',
      maintenance: completedRecord,
      asset: restoredAsset
    });
  } catch (error: any) {
    console.error('PUT /api/assets/maintenance/:maintenanceId/complete error:', error);
    return res.status(500).json({ error: error.message || 'Failed to complete asset maintenance' });
  }
});

// GET /api/assets/:id/maintenance — Get maintenance history for asset
router.get('/:id/maintenance', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { id } = req.params;

    const maintenanceList = await db
      .select({
        id: asset_maintenance.id,
        companyId: asset_maintenance.companyId,
        assetId: asset_maintenance.assetId,
        maintenanceType: asset_maintenance.maintenanceType,
        vendorId: asset_maintenance.vendorId,
        vendorName: vendors.name,
        cost: asset_maintenance.cost,
        scheduledDate: asset_maintenance.scheduledDate,
        completedDate: asset_maintenance.completedDate,
        nextDueDate: asset_maintenance.nextDueDate,
        notes: asset_maintenance.notes,
        status: asset_maintenance.status,
        createdAt: asset_maintenance.createdAt
      })
      .from(asset_maintenance)
      .leftJoin(vendors, eq(asset_maintenance.vendorId, vendors.id))
      .where(and(eq(asset_maintenance.assetId, id), eq(asset_maintenance.companyId, companyId)))
      .orderBy(desc(asset_maintenance.createdAt));

    return res.json({ maintenance: maintenanceList });
  } catch (error: any) {
    console.error('GET /api/assets/:id/maintenance error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch asset maintenance history' });
  }
});

// ==========================================
// 7. ASSET DISPOSAL & WRITE-OFF WORKFLOW
// ==========================================

// POST /api/assets/:id/disposal — Request asset disposal or write-off
router.post('/:id/disposal', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { id } = req.params;
    const { disposalType, saleAmount, disposalDate, notes } = req.body || {};

    if (!disposalType) {
      return res.status(400).json({ error: 'Disposal type is required (Sale, Scrap, WriteOff, Donation)' });
    }

    const [existingAsset] = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), eq(assets.companyId, companyId)))
      .limit(1);

    if (!existingAsset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (existingAsset.status === 'Disposed' || existingAsset.status === 'Sold') {
      return res.status(400).json({ error: `Asset is already in status '${existingAsset.status}'` });
    }

    const bookValueAtDisposal = Number(existingAsset.currentBookValue || 0);
    const saleAmt = disposalType === 'Sale' ? Number(saleAmount || 0) : 0;
    const gainLoss = saleAmt - bookValueAtDisposal;

    // Check for workflow definition
    const [wfDef] = await db
      .select()
      .from(bpmn_definitions)
      .where(and(eq(bpmn_definitions.companyId, companyId), eq(bpmn_definitions.documentType, 'Asset Disposal')))
      .limit(1);

    const [disposalRecord] = await db
      .insert(asset_disposals)
      .values({
        companyId,
        assetId: id,
        disposalType,
        disposalDate: disposalDate ? new Date(disposalDate) : new Date(),
        saleAmount: String(saleAmt.toFixed(2)),
        bookValueAtDisposal: String(bookValueAtDisposal.toFixed(2)),
        gainLoss: String(gainLoss.toFixed(2)),
        approvedByUid: wfDef ? null : (req.user?.uid || null),
        status: wfDef ? 'Pending' : 'Approved'
      })
      .returning();

    if (!wfDef) {
      // Auto-approve disposal if no workflow is configured
      const finalStatus = disposalType === 'Sale' ? 'Sold' : 'Disposed';

      // Cancel remaining Scheduled depreciation rows
      await db
        .update(asset_depreciation_schedule)
        .set({ status: 'Cancelled' })
        .where(
          and(
            eq(asset_depreciation_schedule.assetId, id),
            eq(asset_depreciation_schedule.companyId, companyId),
            eq(asset_depreciation_schedule.status, 'Scheduled')
          )
        );

      const [disposedAsset] = await db
        .update(assets)
        .set({
          status: finalStatus,
          updatedAt: new Date()
        })
        .where(and(eq(assets.id, id), eq(assets.companyId, companyId)))
        .returning();

      return res.json({
        message: `No disposal workflow defined. Asset marked as ${finalStatus} immediately.`,
        disposal: disposalRecord,
        asset: disposedAsset,
        workflowTriggered: false
      });
    }

    // Create approval record & inbox task
    const targetRole = 'Head of Operations';
    await db.insert(document_approvals).values({
      companyId,
      documentType: 'Asset Disposal',
      documentId: 0,
      stepOrder: 1,
      roleRequired: targetRole,
      assigneeValue: disposalRecord.id,
      status: 'Pending'
    });

    await db.insert(inbox_tasks).values({
      companyId,
      category: 'Asset Management',
      referenceType: 'Asset Disposal',
      referenceId: 0,
      actionLink: disposalRecord.id,
      title: `Asset Disposal Request: ${existingAsset.name} (${existingAsset.assetCode}) - ${disposalType}`,
      assignedToRole: targetRole,
      assignedToUid: null,
      status: 'Pending'
    });

    return res.json({
      message: 'Asset disposal request submitted for approval.',
      disposal: disposalRecord,
      workflowTriggered: true
    });
  } catch (error: any) {
    console.error('POST /api/assets/:id/disposal error:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit asset disposal' });
  }
});

// GET /api/assets/disposals/:disposalId — Get single disposal
router.get('/disposals/:disposalId', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { disposalId } = req.params;

    const [disposalRecord] = await db
      .select({
        id: asset_disposals.id,
        assetId: asset_disposals.assetId,
        disposalType: asset_disposals.disposalType,
        disposalDate: asset_disposals.disposalDate,
        saleAmount: asset_disposals.saleAmount,
        bookValueAtDisposal: asset_disposals.bookValueAtDisposal,
        gainLoss: asset_disposals.gainLoss,
        status: asset_disposals.status,
        createdAt: asset_disposals.createdAt,
        assetCode: assets.assetCode,
        assetName: assets.name
      })
      .from(asset_disposals)
      .leftJoin(assets, eq(asset_disposals.assetId, assets.id))
      .where(and(eq(asset_disposals.id, disposalId), eq(asset_disposals.companyId, companyId)))
      .limit(1);

    if (!disposalRecord) {
      return res.status(404).json({ error: 'Disposal not found' });
    }

    return res.json(disposalRecord);
  } catch (error: any) {
    console.error('GET /api/assets/disposals/:disposalId error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch asset disposal' });
  }
});

// POST /api/assets/disposals/:disposalId/approve — Approve disposal
router.post('/disposals/:disposalId/approve', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { disposalId } = req.params;

    const [disposalRecord] = await db
      .select()
      .from(asset_disposals)
      .where(and(eq(asset_disposals.id, disposalId), eq(asset_disposals.companyId, companyId)))
      .limit(1);

    if (!disposalRecord) {
      return res.status(404).json({ error: 'Disposal request not found' });
    }

    if (disposalRecord.status !== 'Pending') {
      return res.status(400).json({ error: `Disposal request is already in status '${disposalRecord.status}'` });
    }

    // Mark inbox tasks as Completed
    await db
      .update(inbox_tasks)
      .set({ status: 'Completed', actionResult: 'Approved' })
      .where(
        and(
          eq(inbox_tasks.companyId, companyId),
          eq(inbox_tasks.referenceType, 'Asset Disposal'),
          eq(inbox_tasks.actionLink, disposalId)
        )
      );

    // Update document_approvals status
    await db
      .update(document_approvals)
      .set({ status: 'Approved', updatedAt: new Date() })
      .where(
        and(
          eq(document_approvals.companyId, companyId),
          eq(document_approvals.documentType, 'Asset Disposal'),
          eq(document_approvals.assigneeValue, disposalId)
        )
      );

    // Update disposal status
    const [approvedDisposal] = await db
      .update(asset_disposals)
      .set({
        status: 'Approved',
        approvedByUid: req.user?.uid || null
      })
      .where(and(eq(asset_disposals.id, disposalId), eq(asset_disposals.companyId, companyId)))
      .returning();

    // Cancel all remaining Scheduled depreciation rows
    await db
      .update(asset_depreciation_schedule)
      .set({ status: 'Cancelled' })
      .where(
        and(
          eq(asset_depreciation_schedule.assetId, approvedDisposal.assetId),
          eq(asset_depreciation_schedule.companyId, companyId),
          eq(asset_depreciation_schedule.status, 'Scheduled')
        )
      );

    // Update asset status
    const finalStatus = approvedDisposal.disposalType === 'Sale' ? 'Sold' : 'Disposed';
    const [disposedAsset] = await db
      .update(assets)
      .set({
        status: finalStatus,
        updatedAt: new Date()
      })
      .where(and(eq(assets.id, approvedDisposal.assetId), eq(assets.companyId, companyId)))
      .returning();

    return res.json({
      message: `Asset disposal approved. Asset status updated to ${finalStatus}.`,
      disposal: approvedDisposal,
      asset: disposedAsset
    });
  } catch (error: any) {
    console.error('POST /api/assets/disposals/:disposalId/approve error:', error);
    return res.status(500).json({ error: error.message || 'Failed to approve asset disposal' });
  }
});

// POST /api/assets/disposals/:disposalId/reject — Reject disposal
router.post('/disposals/:disposalId/reject', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { disposalId } = req.params;

    const [disposalRecord] = await db
      .select()
      .from(asset_disposals)
      .where(and(eq(asset_disposals.id, disposalId), eq(asset_disposals.companyId, companyId)))
      .limit(1);

    if (!disposalRecord) {
      return res.status(404).json({ error: 'Disposal request not found' });
    }

    // Mark inbox tasks as Completed
    await db
      .update(inbox_tasks)
      .set({ status: 'Completed', actionResult: 'Rejected' })
      .where(
        and(
          eq(inbox_tasks.companyId, companyId),
          eq(inbox_tasks.referenceType, 'Asset Disposal'),
          eq(inbox_tasks.actionLink, disposalId)
        )
      );

    // Update document_approvals status
    await db
      .update(document_approvals)
      .set({ status: 'Rejected', updatedAt: new Date() })
      .where(
        and(
          eq(document_approvals.companyId, companyId),
          eq(document_approvals.documentType, 'Asset Disposal'),
          eq(document_approvals.assigneeValue, disposalId)
        )
      );

    const [rejectedDisposal] = await db
      .update(asset_disposals)
      .set({ status: 'Rejected' })
      .where(and(eq(asset_disposals.id, disposalId), eq(asset_disposals.companyId, companyId)))
      .returning();

    return res.json({
      message: 'Asset disposal request rejected.',
      disposal: rejectedDisposal
    });
  } catch (error: any) {
    console.error('POST /api/assets/disposals/:disposalId/reject error:', error);
    return res.status(500).json({ error: error.message || 'Failed to reject asset disposal' });
  }
});

// GET /api/assets/:id/disposals — Get disposal history for asset
router.get('/:id/disposals', requireAuth, checkPlugin('asset-management'), async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    const { id } = req.params;

    const disposalsList = await db
      .select()
      .from(asset_disposals)
      .where(and(eq(asset_disposals.assetId, id), eq(asset_disposals.companyId, companyId)))
      .orderBy(desc(asset_disposals.createdAt));

    return res.json({ disposals: disposalsList });
  } catch (error: any) {
    console.error('GET /api/assets/:id/disposals error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch asset disposal history' });
  }
});

export default router;

