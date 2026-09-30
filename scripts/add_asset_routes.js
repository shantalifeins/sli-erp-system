import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverPath = path.join(__dirname, '../server.ts');
let content = fs.readFileSync(serverPath, 'utf8');

const newRoutes = `

  // Phase 8: Asset Assignments
  app.get("/api/assets/:id/assignments", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(400).json({ error: "No company context" });
      const assetId = req.params.id;
      const assignments = await db.select({
         id: asset_assignments.id,
         assignedToUid: asset_assignments.assignedToUid,
         assignedToName: users.name,
         departmentId: asset_assignments.departmentId,
         departmentName: departments.name,
         branchId: asset_assignments.branchId,
         branchName: branches.name,
         assignedAt: asset_assignments.assignedAt,
         returnedAt: asset_assignments.returnedAt,
         status: asset_assignments.status,
         notes: asset_assignments.notes
      })
      .from(asset_assignments)
      .leftJoin(users, eq(users.uid, asset_assignments.assignedToUid))
      .leftJoin(departments, eq(departments.id, asset_assignments.departmentId))
      .leftJoin(branches, eq(branches.id, asset_assignments.branchId))
      .where(and(eq(asset_assignments.companyId, companyId), eq(asset_assignments.assetId, assetId)))
      .orderBy(sql\`\${asset_assignments.assignedAt} DESC\`);
      
      res.json(assignments);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/assets/:id/assign", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(400).json({ error: "No company context" });
      
      const assetId = req.params.id;
      const { assignedToUid, departmentId, branchId, locationId, notes } = req.body;
      
      // Verify asset exists and is available
      const asset = await db.select().from(assets).where(and(eq(assets.companyId, companyId), eq(assets.id, assetId))).limit(1);
      if (!asset.length) return res.status(404).json({ error: "Asset not found" });
      if (asset[0].status === 'Disposed' || asset[0].status === 'Sold') return res.status(400).json({ error: "Cannot assign disposed asset" });

      // Mark previous active assignments as returned
      await db.update(asset_assignments)
         .set({ returnedAt: new Date(), status: 'Returned' })
         .where(and(eq(asset_assignments.assetId, assetId), eq(asset_assignments.status, 'Active')));

      // Insert new assignment
      await db.insert(asset_assignments).values({
         companyId,
         assetId,
         assignedToUid: assignedToUid || null,
         departmentId: departmentId || null,
         branchId: branchId || null,
         locationId: locationId || null,
         notes,
         assignedByUid: req.user!.uid,
         assignedAt: new Date(),
         status: 'Active'
      });

      // Update asset custodian/department
      await db.update(assets).set({
         custodianUid: assignedToUid || null,
         departmentId: departmentId || null,
         branchId: branchId || null,
         locationId: locationId || null,
         updatedAt: new Date()
      }).where(eq(assets.id, assetId));

      res.json({ message: "Asset assigned successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/assets/:id/return", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(400).json({ error: "No company context" });
      
      const assetId = req.params.id;
      const { notes } = req.body;

      await db.update(asset_assignments)
         .set({ returnedAt: new Date(), status: 'Returned', notes: sql\`COALESCE(notes || ' | ', '') || \${notes}\` })
         .where(and(eq(asset_assignments.assetId, assetId), eq(asset_assignments.status, 'Active')));

      await db.update(assets).set({
         custodianUid: null,
         updatedAt: new Date()
      }).where(eq(assets.id, assetId));

      res.json({ message: "Asset returned successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

`;

const targetString = `app.post("/api/assets/:id/capitalize"`;
if (!content.includes(targetString)) {
    console.error("Target string not found!");
    process.exit(1);
}

// 2. Add asset_assignments to imports
if (!content.includes("asset_assignments,")) {
    content = content.replace("assets,", "assets,\n  asset_assignments,");
}

content = content.replace(targetString, newRoutes + targetString);
fs.writeFileSync(serverPath, content, 'utf8');
console.log('Successfully injected asset assignment routes');
