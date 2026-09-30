import express from 'express';
import { db } from '../../../shared/db/index.js';
import { digital_assets, vendors, digital_asset_renewals, digital_asset_users, digital_asset_amortization, users } from '../../../shared/db/schema.js';
import { eq, desc, and } from 'drizzle-orm';
import { AuthRequest } from '../../../shared/middleware/auth.js';
import { resolveTenantId, requireTenant } from '../../../shared/lib/tenant.js';
import { requirePermission } from '../../../shared/middleware/permissions.js';
import { audit_logs } from '../../../shared/db/schema.js';

const router = express.Router();

  // DIGITAL ASSETS API ROUTES (Phase 2/3)
  // ==========================================

  router.get("/", requirePermission('Digital Asset Register', 'canView'), async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!requireTenant(companyId, res)) return;
      const dbAssets = await db.select({
        id: digital_assets.id,
        assetCode: digital_assets.assetCode,
        name: digital_assets.name,
        assetType: digital_assets.assetType,
        status: digital_assets.status,
        acquisitionCost: digital_assets.acquisitionCost,
        expiryDate: digital_assets.expiryDate,
        vendorId: digital_assets.vendorId,
        vendorName: vendors.name, licenseKeyEncrypted: digital_assets.licenseKeyEncrypted})
      .from(digital_assets)
      .leftJoin(vendors, eq(digital_assets.vendorId, vendors.id))
      .where(eq(digital_assets.companyId, companyId))
      .orderBy(desc(digital_assets.createdAt));
      const assets = dbAssets.map((a: any) => {
        const { licenseKeyEncrypted, ...rest } = a;
        return { ...rest, hasLicenseKey: !!licenseKeyEncrypted };
      });
      res.json(assets);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch digital assets" });
    }
  });

  router.get("/:id", requirePermission('Digital Asset Register', 'canView'), async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!requireTenant(companyId, res)) return;
      const { id } = req.params;
      const asset = await db.select().from(digital_assets).where(and(eq(digital_assets.id, id), eq(digital_assets.companyId, companyId))).limit(1);
      if (asset.length === 0) return res.status(404).json({ error: "Not found" });
      
      const renewals = await db.select().from(digital_asset_renewals).where(eq(digital_asset_renewals.digitalAssetId, id)).orderBy(desc(digital_asset_renewals.renewalDate));
      const usersList = await db.select({
        id: digital_asset_users.id,
        assignedUid: digital_asset_users.assignedUid,
        userName: users.name,
        userEmail: users.email,
        assignedAt: digital_asset_users.assignedAt,
        status: digital_asset_users.status
      })
      .from(digital_asset_users)
      .leftJoin(users, eq(digital_asset_users.assignedUid, users.uid))
      .where(eq(digital_asset_users.digitalAssetId, id));

      const amortizations = await db.select().from(digital_asset_amortization).where(eq(digital_asset_amortization.digitalAssetId, id)).orderBy(desc(digital_asset_amortization.periodDate));

      const { licenseKeyEncrypted, ...assetData } = asset[0];
      res.json({ ...assetData, hasLicenseKey: !!licenseKeyEncrypted, renewals, users: usersList, amortizations });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch asset details" });
    }
  });

  router.post("/", requirePermission('Digital Asset Register', 'canCreate'), async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!requireTenant(companyId, res)) return;
      const payload = req.body;
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const assetCode = `DIG-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;

      const [newAsset] = await db.insert(digital_assets).values({
        companyId,
        assetCode,
        name: payload.name,
        assetType: payload.assetType || 'Software License',
        vendorId: payload.vendorId || null,
        departmentId: payload.departmentId || null,
        custodianUid: payload.custodianUid || null,
        licenseKeyEncrypted: payload.licenseKeyEncrypted || null,
        portalUrl: payload.portalUrl || null,
        activationDate: payload.activationDate ? new Date(payload.activationDate) : new Date(),
        expiryDate: payload.expiryDate ? new Date(payload.expiryDate) : null,
        acquisitionCost: String(payload.acquisitionCost || '0'),
        currency: payload.currency || 'BDT',
        status: payload.status || 'Active',
        autoRenewal: payload.autoRenewal || false,
        createdByUid: req.user!.uid
      }).returning();

      res.json(newAsset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create digital asset" });
    }
  });

  router.put("/:id", requirePermission('Digital Asset Register', 'canEdit'), async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!requireTenant(companyId, res)) return;
      const { id } = req.params;
      const payload = req.body;

      const [updatedAsset] = await db.update(digital_assets).set({
        name: payload.name,
        assetType: payload.assetType,
        vendorId: payload.vendorId || null,
        departmentId: payload.departmentId || null,
        custodianUid: payload.custodianUid || null,
        licenseKeyEncrypted: payload.licenseKeyEncrypted || null,
        portalUrl: payload.portalUrl || null,
        activationDate: payload.activationDate ? new Date(payload.activationDate) : undefined,
        expiryDate: payload.expiryDate ? new Date(payload.expiryDate) : null,
        acquisitionCost: payload.acquisitionCost ? String(payload.acquisitionCost) : undefined,
        currency: payload.currency,
        status: payload.status,
        autoRenewal: payload.autoRenewal,
        updatedAt: new Date()
      }).where(and(eq(digital_assets.id, id), eq(digital_assets.companyId, companyId))).returning();

      res.json(updatedAsset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update digital asset" });
    }
  });

  router.post("/:id/renew", async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!requireTenant(companyId, res)) return;
      const { id } = req.params;
      const { renewalDate, newExpiryDate, amount, notes } = req.body;

      const [renewal] = await db.insert(digital_asset_renewals).values({
        companyId,
        digitalAssetId: id,
        renewalDate: new Date(renewalDate),
        newExpiryDate: new Date(newExpiryDate),
        amount: String(amount),
        notes,
        renewedByUid: req.user!.uid
      }).returning();

      await db.update(digital_assets).set({
        expiryDate: new Date(newExpiryDate),
        status: 'Active',
        updatedAt: new Date()
      }).where(and(eq(digital_assets.id, id), eq(digital_assets.companyId, companyId)));

      res.json(renewal);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to record renewal" });
    }
  });

  router.post("/:id/users", async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!requireTenant(companyId, res)) return;
      const { id } = req.params;
      const { assignedUid, assignedAt, notes } = req.body;

      const [assetUser] = await db.insert(digital_asset_users).values({
        companyId,
        digitalAssetId: id,
        assignedUid,
        assignedAt: assignedAt ? new Date(assignedAt) : new Date(),
        status: 'Active',
        notes
      }).returning();

      res.json(assetUser);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to assign user" });
    }
  });

  router.post("/users/:userId/revoke", async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!requireTenant(companyId, res)) return;
      const { userId } = req.params;
      
      const [revoked] = await db.update(digital_asset_users).set({
        status: 'Revoked',
        revokedAt: new Date()
      }).where(and(eq(digital_asset_users.id, userId), eq(digital_asset_users.companyId, companyId))).returning();
      
      res.json(revoked);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to revoke user" });
    }
  });

  router.post("/:id/amortize", async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!requireTenant(companyId, res)) return;
      const { id } = req.params;
      const { periodNumber, periodDate, amortizationAmount, accumulatedAmortization, bookValueAfter } = req.body;

      const [amort] = await db.insert(digital_asset_amortization).values({
        companyId,
        digitalAssetId: id,
        periodNumber: Number(periodNumber),
        periodDate: new Date(periodDate),
        amortizationAmount: String(amortizationAmount),
        accumulatedAmortization: String(accumulatedAmortization),
        bookValueAfter: String(bookValueAfter),
        status: 'Posted',
        postedAt: new Date(),
        postedByUid: req.user!.uid
      }).returning();

      res.json(amort);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to post amortization" });
    }
  });



  router.post("/:id/reveal-secret", requirePermission('License Secret Reveal', 'canView'), async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!requireTenant(companyId, res)) return;
      const { id } = req.params;
      
      const asset = await db.select().from(digital_assets).where(and(eq(digital_assets.id, id), eq(digital_assets.companyId, companyId))).limit(1);
      if (asset.length === 0) return res.status(404).json({ error: "Not found" });

      await db.insert(audit_logs).values({
        uid: req.user!.uid,
        action: 'Reveal Digital Asset Secret',
        entity: 'digital_assets',
        entityId: id,
        details: { message: `Revealed license secret for digital asset ${asset[0].assetCode}`, companyId, ip: req.ip || 'Unknown' },
      });

      res.json({ licenseKey: asset[0].licenseKeyEncrypted }); // Simple return since it's just a demo mock
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to reveal secret" });
    }
  });

export default router;
