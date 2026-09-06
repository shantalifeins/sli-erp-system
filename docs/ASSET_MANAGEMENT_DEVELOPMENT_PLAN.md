# Asset Management Module — Phase-wise Development Plan (SLI ERP)
### Compiled with Full Codebase Dependency Analysis

> প্রতিটা ফেজে **কী করতে হবে** এবং **বিদ্যমান কোডের কোথায় হাত দিতে হবে** — উভয় একসাথে।
> Sequential dependency: এক ফেজ টেস্ট পাস না করলে পরেরটা শুরু হবে না।

---

## ০. Cross-cutting Rules (সব ফেজে প্রযোজ্য)

1. প্রতিটা Express route-এ `let companyId = await resolveTenantId(req);` — cross-tenant fallback **নিষিদ্ধ**।
2. Backend গার্ড: `checkPlugin('asset-management')` middleware।
3. Frontend গার্ড: `<PluginProtectedRoute pluginSlug="asset-management">` wrapper।
4. RBAC: `role_permissions.module = 'asset-management'`, `Admin.tsx` hierarchy-তে যোগ।
5. Schema পরিবর্তন → `npx drizzle-kit push` (TTY fail হলে raw SQL script → delete)।
6. ফর্ম সাবমিট → `isSubmitting` guard (double-submit prevention)।
7. ফেজ শেষে `DEVELOPER_GUIDE.md` আপডেট।
8. **প্রতিটা ফেজ শেষে পুরনো + নতুন সব টেস্ট পাস করাতে হবে।**

**Naming Convention:**
- Plugin slug: `asset-management`
- RBAC module key: `asset-management`
- Workflow `documentType`: `'Asset Acquisition'`, `'Asset Transfer'`, `'Asset Disposal'`
- Route prefix: `/api/assets/*`
- Frontend path: `src/modules/assets/`
- Asset code format: `AST-YYYYMMDD-XXXX`

---

## Critical Risk Areas (সব ডেভেলপারকে আগে পড়তে হবে)

**Phase 4 — QC Inspection Handler**: `server.ts` L3761-L3975 (~300 লাইনের complex handler)। এখানে WAC calculation, warehouse stock, global ledger, vendor metrics, rejected dispositions সব একসাথে হয়। ভুল hook যোগ করলে stock data corrupt হতে পারে। **Regression test আগে লিখতে হবে, তারপর hook।**

**FK Cascade**: `assets.custodianUid -> users.uid` এবং অন্য `users.uid` FK-তে `{ onUpdate: 'cascade' }` বাধ্যতামূলক।

**Layout.tsx sidebar ordering**: Asset module block inventory block-এর আগে রাখতে হবে — `/assets*` vs `/inventory*` prefix conflict নেই, কিন্তু ordering নিশ্চিত করতে হবে।

**server.ts monolithic**: নতুন Asset routes আলাদা router file-এ রেখে mount করা — যেমন user-panel করা হয়েছে (`server.ts` L769)।

---

## Phase 0 — Discovery, Schema Design & ERD (Planning Only)

**Goal:** কোনো কোড লেখার আগে schema ও workflow ডিজাইন ফাইনাল করা।

### Deliverables

**`docs/ASSET_MANAGEMENT_SCHEMA_DESIGN.md`** তৈরি (নতুন ফাইল) — নিচের টেবিলগুলোর field-level ERD:

| টেবিল | মূল ফিল্ড |
|-------|-----------|
| `asset_categories` | companyId, name, code, defaultDepreciationMethod, defaultUsefulLifeMonths, defaultSalvagePercent, fixedAssetAccount, depreciationAccount, expenseAccount, status |
| `assets` | companyId, assetCode (AST-YYYYMMDD-XXXX), name, categoryId, branchId, warehouseId, custodianUid *(cascade)*, departmentId, acquisitionDate, acquisitionCost, salvageValue, depreciationMethod, usefulLifeMonths, depreciationStartDate, accumulatedDepreciation, currentBookValue, status (Draft/PendingApproval/Active/UnderMaintenance/Disposed/Sold), sourceType (Manual/GRN), sourceGrnId, serialNumber, qrCode, createdByUid |
| `asset_depreciation_schedule` | assetId, periodNumber, periodDate, depreciationAmount, accumulatedDepreciation, bookValueAfter, status (Scheduled/Posted/Cancelled) |
| `asset_transfers` | assetId, fromBranchId, fromCustodianUid *(cascade)*, toBranchId, toCustodianUid *(cascade)*, reason, status, requestedBy |
| `asset_maintenance` | assetId, maintenanceType (Preventive/Corrective/Warranty), vendorId, cost, scheduledDate, completedDate, nextDueDate, status |
| `asset_disposals` | assetId, disposalType (Sale/Scrap/WriteOff/Donation), disposalDate, saleAmount, bookValueAtDisposal, gainLoss, approvedByUid *(cascade)*, status |

**Integration Point Confirmation:**
- `inventory_items.isFixedAsset` — **ইতিমধ্যে schema-তে আছে** (`schema.ts` L527) → Phase 4-এ QC hook এটা চেক করবে।
- `inventory_items.category = 'Fixed Asset'` → fallback চেক।
- `grn.id` → `assets.sourceGrnId` FK (Phase 4 link)।
- `vendors.id` → `asset_maintenance.vendorId` (Phase 8 link — vendors table ইতিমধ্যে আছে)।

### Testing (Phase 0)
- কোনো কোড নেই → **Design Review Checklist**:
  - [ ] প্রতিটা টেবিলে `companyId` আছে?
  - [ ] `users.uid` FK-তে `{ onUpdate: 'cascade' }` আছে?
  - [ ] নামকরণ `snake_case` (DB) / `camelCase` (Drizzle) convention মানছে?
  - [ ] FK target সব valid existing table?
- **Exit criteria**: ডিজাইন approved না হলে Phase 1 শুরু হবে না।

---

## Phase 1 — Foundation: Plugin Registration + Core DB Schema

**Goal:** Plugin infra + `asset_categories`, `assets` টেবিল (depreciation/workflow ছাড়া)।

### Files to MODIFY

**1. `src/shared/db/schema.ts`**
- নতুন `asset_categories` এবং `assets` টেবিল যোগ।
- `assets.custodianUid -> users.uid` FK: `{ onDelete: 'set null', onUpdate: 'cascade' }` বাধ্যতামূলক।

**2. `server.ts` — Plugin seed block (L984-L993)**
```ts
// বিদ্যমান:
const corePlugins = [
  { slug: 'procurement', ... },
  { slug: 'inventory', ... },
  { slug: 'user-panel', ... },
  // এটা যোগ করতে হবে:
  { slug: 'asset-management', name: 'Asset Management',
    description: 'Fixed asset tracking, depreciation, and lifecycle management.',
    version: '1.0.0' },
];
```

**3. `server.ts` — Import block (L10-L13)**
- নতুন schema tables (`asset_categories`, `assets`) import-এ যোগ।

### Files to CREATE
- `tests/asset-schema.test.ts` (নতুন)

### Testing (Phase 1)
```ts
describe('Asset Management — Schema & Plugin Foundation', () => {
  it('should have asset-management plugin seeded');
  it('should allow creating an asset_category scoped to a company');
  it('should reject asset_category insert without companyId (FK violation)');
  it('should enable company_plugins activation for asset-management');
});
```
**Regression**: `tests/database.test.ts` পাস verify।

---

## Phase 2 — Backend CRUD: Asset Categories & Manual Asset Entry

**Goal:** API endpoints — category ও asset CRUD, কোনো workflow/depreciation ছাড়া।

### Files to MODIFY

**1. `server.ts` — Router mount (L769 এর কাছে)**
```ts
// বিদ্যমান pattern (L769):
app.use('/api/user-panel', requireAuth, checkPlugin('user-panel'), userPanelRoutes);
// এই pattern অনুসরণ করে:
app.use('/api/assets', requireAuth, checkPlugin('asset-management'), assetsRouter);
```

**2. `server.ts` — Import (top)**
```ts
import assetsRouter from './src/modules/assets/api/routes.js';
```

### Files to CREATE
**`src/modules/assets/api/routes.ts`** — সব asset CRUD endpoints:
- `GET/POST/PUT/DELETE /api/assets/categories`
- `GET/POST/PUT /api/assets` (list with filters: categoryId, branchId, status, pagination)
- `GET /api/assets/:id`

**Auto-code generation** (বিদ্যমান PSC pattern — `server.ts` L6102-6105 অনুসরণ করে):
```ts
const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
const existing = await db.select({ count: sql`count(*)` }).from(assets).where(eq(assets.companyId, companyId));
const seq = String(Number(existing[0].count) + 1).padStart(4, '0');
const assetCode = `AST-${dateStr}-${seq}`;
```

- `tests/asset-crud.test.ts` (নতুন)

### Testing (Phase 2)
```ts
describe('Asset Management — CRUD API', () => {
  it('creates an asset category for the test company');
  it('creates an asset with auto-generated unique assetCode');
  it('lists assets scoped strictly to the requesting company (cross-tenant isolation)');
  it('rejects request without valid tenant/plugin activation (403)');
  it('updates an asset and persists changes');
  it('prevents duplicate assetCode collisions under concurrent creation');
});
```
**Critical**: দুই company সেটআপ করে cross-tenant isolation verify।

---

## Phase 3 — Frontend: Asset List/Create/Edit + Menu Wiring

**Goal:** সম্পূর্ণ UI — sidebar, routes, RBAC, Home module card।

### Files to MODIFY

**1. `src/App.tsx`** — নতুন imports + routes:
```tsx
import AssetDashboard from '@/src/modules/assets/pages/AssetDashboard';
import Assets from '@/src/modules/assets/pages/Assets';
import AssetCategories from '@/src/modules/assets/pages/AssetCategories';

<Route path="/assets-dashboard" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><AssetDashboard /></PluginProtectedRoute></PrivateRoute>} />
<Route path="/assets" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><Assets /></PluginProtectedRoute></PrivateRoute>} />
<Route path="/asset-categories" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><AssetCategories /></PluginProtectedRoute></PrivateRoute>} />
```

**2. `src/shared/components/Layout.tsx`** — `activeModule` logic (L112 এর কাছে):
```ts
} else if (path === '/assets-dashboard' || path.startsWith('/assets') || path.startsWith('/asset-')) {
  activeModule = 'asset-management';
  activeModuleName = 'Asset Management';
}
```
- `currentMenus` assignment (L219-222)-এ `asset-management` case যোগ।
- নতুন `assetMenus` array তৈরি করতে হবে।

**3. `src/modules/home/pages/Home.tsx`** — `modules` array (L16) + `moduleMenusMap` (L60):
```ts
// modules array-এ:
{ title: 'Asset Management', path: '/assets-dashboard', pluginSlug: 'asset-management', ... },
// moduleMenusMap-এ:
'Asset Management': ['Dashboard', 'Assets', 'Asset Categories', 'Depreciation', 'Reports'],
```

**4. `src/modules/admin/pages/Admin.tsx`**

**(a) `hierarchy` array (L106-L163)-এ নতুন module block:**
```ts
{
  module: "Asset Management",
  menus: [
    { name: "Dashboard", actions: ["canView"] },
    { name: "Assets", actions: ["canView", "canCreate", "canEdit", "canDelete", "canApprove"] },
    { name: "Asset Categories", actions: ["canView", "canCreate", "canEdit", "canDelete"] },
    { name: "Depreciation", actions: ["canView", "canCreate"] },
    { name: "Asset Transfer", actions: ["canView", "canCreate", "canApprove"] },
    { name: "Asset Maintenance", actions: ["canView", "canCreate", "canEdit"] },
    { name: "Asset Disposal", actions: ["canView", "canCreate", "canApprove"] },
    { name: "Reports", actions: ["canView"] },
  ]
},
```

**(b) Plugin visibility check (L1715-1717 এর কাছে):**
```ts
if (mod.module === "Asset Management") return activePlugins.includes("asset-management");
```

### Files to CREATE
```
src/modules/assets/pages/
├── AssetDashboard.tsx
├── Assets.tsx
└── AssetCategories.tsx
```

### Testing (Phase 3) — Manual UAT
- [ ] Asset তৈরি করুন → লিস্টে দেখা যাচ্ছে কিনা
- [ ] Sidebar `Asset Management` active হচ্ছে `/assets` path-এ
- [ ] Non-admin রোলে permission ছাড়া মেনু hidden
- [ ] Company B user Company A-র asset দেখতে পাচ্ছে না
- [ ] `isSubmitting` guard কাজ করছে (double-submit prevention)
- [ ] HTML5 `required` attribute দিয়ে asterisk (manual span নেই)
- [ ] `<ArrowLeft />` back button আছে

---

## Phase 4 — Procurement Integration: Auto-create Asset from GRN

**Goal:** QC pass → `isFixedAsset = true` item → `Draft` asset auto-create।

### Files to MODIFY

**1. `server.ts` — QC inspection handler (L3761-L3975)**

> IMPORTANT: এই section-এ code করার আগে `tests/asset-grn-integration.test.ts` লিখতে হবে।

বিদ্যমান hook chain-এর শেষে (`rejected_item_dispositions` block-এর পরে) যোগ করতে হবে:
```ts
// Auto-create Asset from GRN if item is a Fixed Asset
if (newlyPassed > 0 && companyId) {
  try {
    const poItemData = await db.select().from(po_items).where(eq(po_items.id, grnItem[0].poItemId));
    if (poItemData.length > 0) {
      const invItem = await db.select().from(inventory_items).where(
        and(eq(inventory_items.companyId, companyId), ilike(inventory_items.name, poItemData[0].itemName.trim()))
      ).limit(1);

      if (invItem.length > 0 && invItem[0].isFixedAsset) {
        // Deduplication: check if asset already exists for this grnId
        const existingAsset = await db.select().from(assets).where(
          and(eq(assets.sourceGrnId, grnId), eq(assets.companyId, companyId))
        ).limit(1);

        if (existingAsset.length === 0) {
          const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
          const assetCount = await db.select({ count: sql`count(*)` }).from(assets).where(eq(assets.companyId, companyId));
          const seq = String(Number(assetCount[0].count) + 1).padStart(4, '0');

          await db.insert(assets).values({
            companyId, assetCode: `AST-${dateStr}-${seq}`,
            name: poItemData[0].itemName, sourceType: 'GRN', sourceGrnId: grnId,
            acquisitionDate: new Date(),
            acquisitionCost: String(poItemData[0].unitPrice || '0'),
            status: 'Draft', createdByUid: req.user!.uid,
          });
        }
      }
    }
  } catch (assetErr) {
    console.warn('Auto-asset creation from GRN failed (non-fatal):', assetErr);
  }
}
```

**2. `server.ts` — Import block**
- `assets`, `asset_categories` tables import-এ যোগ।

### Files to CREATE
- `tests/asset-grn-integration.test.ts` (নতুন — **আগে লিখতে হবে**)

### Testing (Phase 4)
```ts
describe('Asset Auto-creation from GRN QC Pass', () => {
  it('creates a Draft asset when a fixed-asset item passes QC');
  it('does NOT create an asset for non-fixed-asset (consumable) items');
  it('correctly links sourceGrnId and prefills acquisitionCost from PO unit price');
  it('does not duplicate asset on repeated/partial QC re-inspection of same GRN item');
});
```
**Regression**: `tests/fulfillment.test.ts` পাস verify (QC/WAC calculation ভাঙেনি)।

---

## Phase 5 — Depreciation Engine

**Goal:** Straight-Line schedule auto-generate, period-wise post wizard।

### Files to MODIFY

**1. `src/shared/db/schema.ts`**
- `asset_depreciation_schedule` টেবিল যোগ।
- `drizzle-kit push` রান।

**2. `src/modules/assets/api/routes.ts`** — নতুন endpoints:
- `POST /api/assets/:id/activate` — Draft→Active → schedule bulk insert
- `POST /api/assets/compute-depreciation` — wizard: due Scheduled periods → Posted

### Key Logic (Pure function — no DB):
```ts
function calculateStraightLineSchedule(
  acquisitionCost: number,
  salvageValue: number,
  usefulLifeMonths: number,
  startDate: Date
): DepreciationPeriod[] {
  const depreciableAmount = acquisitionCost - salvageValue;
  const monthlyDep = depreciableAmount / usefulLifeMonths;
  // generate array, handle rounding on last period to avoid float drift
}
```

### Files to CREATE
- `tests/asset-depreciation.test.ts` (নতুন)

### Testing (Phase 5)
```ts
describe('Depreciation Engine', () => {
  it('pure function: generates correct N-period schedule summing to (cost - salvage)');
  it('handles non-round useful-life without floating point drift');
  it('compute-depreciation wizard posts only due periods, leaves future Scheduled');
  it('book value never goes below salvageValue after final period posted');
  it('accumulatedDepreciation matches sum of all Posted schedule rows');
});
```
**Unit test** (pure function, no DB) + **integration test** (wizard + DB state) — উভয়ই বাধ্যতামূলক।

---

## Phase 6 — BPMN Workflow: Asset Acquisition Approval

**Goal:** Asset Draft → PendingApproval → Active approval workflow।

### Files to MODIFY

**1. `src/modules/assets/api/routes.ts`** — নতুন endpoints:
- `POST /api/assets/:id/submit` — workflow trigger (`evaluateWorkflowPath` — already exists in `server.ts` L24)
- `POST /api/assets/:id/approve` — approval step processing

Pattern reference: PR approval flow (`server.ts` L2215).

**2. `server.ts` — `DEFAULT_NOTIFICATION_TEMPLATES` (L189 এর পরে)**:
```ts
"Asset Acquisition Approval Required": {
  module: "Asset Management",
  titleTemplate: "Asset Acquisition Approval Required",
  bodyTemplate: "Asset {{reference}} requires your approval.",
  recipient: "Approver"
},
"Asset Approved": { module: "Asset Management", ... },
"Asset Rejected": { module: "Asset Management", ... },
```

**3. `src/modules/admin/pages/WorkflowDesigner.tsx`**

**(a) `availableOptions` array (L65)**:
```ts
// বিদ্যমান 7টি options-এর সাথে যোগ করতে হবে:
'Asset Acquisition', 'Asset Disposal',
```

**(b) Description block (L247-L255 এর কাছে)**:
```tsx
{documentType === 'Asset Acquisition' && "Triggered when a new asset is submitted for approval."}
{documentType === 'Asset Disposal' && "Triggered when an asset disposal request is submitted."}
```

**4. `src/modules/admin/pages/Admin.tsx`** — Workflow badge (L1521-1522):
```tsx
['Asset Acquisition', 'Asset Transfer', 'Asset Disposal'].includes(w.documentType) ? 'Asset Management' :
```

### Files to CREATE
- `tests/asset-approval-workflow.test.ts` (নতুন)

### Testing (Phase 6)
```ts
describe('Asset Acquisition Approval Workflow', () => {
  it('creates document_approvals + first inbox_tasks entry on asset submission');
  it('approving final step flips asset status to Active + triggers depreciation schedule');
  it('rejecting marks asset Draft + clears all pending inbox_tasks as Completed');
  it('falls back to assignedToRole with null uid when no approver resolves');
  it('GET /api/inbox returns Asset Acquisition tasks correctly scoped');
});
```

---

## Phase 7 — Asset Transfer Workflow

**Goal:** Branch/Custodian/Warehouse transfer রেকর্ড ও approval।

### Files to MODIFY

**1. `src/shared/db/schema.ts`**
- `asset_transfers` টেবিল যোগ (`fromCustodianUid`, `toCustodianUid → users.uid` → `{ onUpdate: 'cascade' }`)।
- `drizzle-kit push` রান।

**2. `src/modules/assets/api/routes.ts`** — নতুন endpoints:
- `POST /api/assets/:id/transfer`
- `PUT /api/assets/transfers/:id/approve` — updates `assets.custodianUid`/`branchId`/`warehouseId`
- `GET /api/assets/:id/transfers` — history (read-only timeline)

**3. `src/modules/admin/pages/WorkflowDesigner.tsx`** — `availableOptions`-এ `'Asset Transfer'` যোগ।

**4. `server.ts` — `DEFAULT_NOTIFICATION_TEMPLATES`**:
```ts
"Asset Transfer Approval Required": { module: "Asset Management", ... },
```

### Files to CREATE
- `src/modules/assets/pages/AssetDetail.tsx` — transfer history timeline
- `tests/asset-transfer.test.ts` (নতুন)

### Testing (Phase 7)
```ts
describe('Asset Transfer', () => {
  it('creates a transfer request and keeps asset custodian unchanged until approved');
  it('on approval, updates asset custodianUid/branchId/warehouseId correctly');
  it('transfer history is preserved and queryable per asset');
});
```

---

## Phase 8 — Maintenance Tracking

**Goal:** Preventive/Corrective/Warranty maintenance রেকর্ড, `Active ⇄ UnderMaintenance` toggle।

### Files to MODIFY

**1. `src/shared/db/schema.ts`**
- `asset_maintenance` টেবিল যোগ — `vendorId -> vendors.id` FK (**vendors table already exists** — `schema.ts` L183)।
- `drizzle-kit push` রান।

**2. `src/modules/assets/api/routes.ts`** — নতুন endpoints:
- `POST /api/assets/:id/maintenance` → `asset.status = 'UnderMaintenance'`
- `PUT /api/assets/maintenance/:id/complete` → `asset.status = 'Active'`, set `nextDueDate`
- Guard: একটা asset-এ একসাথে একটাই `open` maintenance record।

### Files to CREATE
- `src/modules/assets/pages/AssetMaintenance.tsx`
- `tests/asset-maintenance.test.ts` (নতুন)

### Testing (Phase 8)
```ts
describe('Asset Maintenance', () => {
  it('starting maintenance sets asset.status = UnderMaintenance');
  it('completing maintenance restores asset.status = Active and sets nextDueDate');
  it('rejects creating a second open maintenance record for the same asset');
});
```

---

## Phase 9 — Disposal & Write-off Workflow

**Goal:** Asset বিক্রি/স্ক্র্যাপ/write-off approval workflow, gain/loss calculation।

### Files to MODIFY

**1. `src/shared/db/schema.ts`**
- `asset_disposals` টেবিল যোগ (`approvedByUid -> users.uid` → `{ onUpdate: 'cascade' }`)।
- `drizzle-kit push` রান।

**2. `src/modules/assets/api/routes.ts`** — নতুন endpoints:
- `POST /api/assets/:id/disposal` — disposal request → `'Asset Disposal'` workflow trigger
- Approval logic:
  - `gainLoss = saleAmount - bookValueAtDisposal`
  - `asset.status = 'Disposed'` / `'Sold'`
  - বাকি সব `Scheduled` depreciation row → `Cancelled`

**3. `server.ts` — `DEFAULT_NOTIFICATION_TEMPLATES`**:
```ts
"Asset Disposal Approval Required": { module: "Asset Management", ... },
```

Note: `'Asset Disposal'` documentType WorkflowDesigner-এ **Phase 6-এ already যোগ হয়েছে** ✅

### Files to CREATE
- `src/modules/assets/pages/AssetDisposal.tsx`
- `tests/asset-disposal.test.ts` (নতুন)

### Testing (Phase 9)
```ts
describe('Asset Disposal', () => {
  it('computes correct gainLoss for a sale above/below book value');
  it('cancels all remaining Scheduled depreciation rows on disposal approval');
  it('disposed asset no longer appears in compute-depreciation wizard runs');
  it('disposal requires approval before status changes (draft request != executed)');
});
```

---

## Phase 10 — Reporting & Dashboard

**Goal:** Asset Register, Depreciation Report, Valuation Summary।

### Files to MODIFY
- `src/modules/assets/pages/AssetDashboard.tsx` — charts ও summary widgets।

### Files to CREATE

**`src/modules/assets/api/reports.ts`** — রিপোর্ট endpoints:
- `GET /api/assets/reports/register` — Asset Register (filters: category, branch, status, date range)
- `GET /api/assets/reports/depreciation` — period-wise depreciation summary
- `GET /api/assets/reports/valuation` — total book value summary
- Export: xlsx (`xlsx` library — **already installed**, `package.json` L50)

- `src/modules/assets/pages/AssetReports.tsx`
- `tests/asset-reports.test.ts` (নতুন)

### Testing (Phase 10)
```ts
describe('Asset Reports', () => {
  it('valuation report total book value matches sum of assets.currentBookValue in DB');
  it('depreciation report period totals match sum of Posted schedule rows for that period');
  it('reports respect company scoping and role-based visibility');
});
```

---

## Phase 11 (Optional) — QR/Barcode Physical Verification

**Goal:** `physical_stock_counts` pattern-এ asset physical audit।

### Files to MODIFY

**1. `src/shared/db/schema.ts`**
- `asset_physical_verifications` + `asset_verification_details` টেবিল।
- Pattern reference: `physical_stock_counts` + `physical_count_details` (`schema.ts` L722-L757)।
- `drizzle-kit push` রান।

**2. `src/modules/assets/api/routes.ts`** — verification endpoints।
**3. `src/modules/assets/pages/Assets.tsx`** — QR code generation on asset create।

### Files to CREATE
- `src/modules/assets/pages/AssetVerification.tsx`

---

## Phase 12 — Hardening, Full Regression & Production Deployment

**Goal:** পুরো module production-ready।

### Final Checklist

**Code Audit:**
- [ ] সব routes-এ `resolveTenantId(req)` verified
- [ ] সব routes `checkPlugin('asset-management')` দিয়ে guarded
- [ ] `hierarchy` array সব menus কভার করছে
- [ ] সব `users.uid` FK-তে `{ onUpdate: 'cascade' }` আছে
- [ ] Double-submit guards (`isSubmitting`) সব form-এ

**Tests (সব green হতে হবে):**
- [ ] `tests/database.test.ts`
- [ ] `tests/fulfillment.test.ts` (QC regression)
- [ ] `tests/procurement.test.ts`
- [ ] `tests/quotations.test.ts`
- [ ] `tests/work_order.test.ts`
- [ ] `tests/asset-schema.test.ts`
- [ ] `tests/asset-crud.test.ts`
- [ ] `tests/asset-grn-integration.test.ts`
- [ ] `tests/asset-depreciation.test.ts`
- [ ] `tests/asset-approval-workflow.test.ts`
- [ ] `tests/asset-transfer.test.ts`
- [ ] `tests/asset-maintenance.test.ts`
- [ ] `tests/asset-disposal.test.ts`
- [ ] `tests/asset-reports.test.ts`

**Docs:**
- [ ] `DEVELOPER_GUIDE.md` — নতুন module section
- [ ] `.agents/AGENTS.md` — Asset Management rules

**Deployment:**
```
local npm run build → git push (shantalifeins/sli-erp-system.git)
→ scripts/mcp-deploy-server.ts → live server git pull
```
Direct SSH নিষিদ্ধ।

---

## Complete Touch Points Reference Table

| Phase | Modified Files | Created Files |
|-------|---------------|---------------|
| 0 | — | `docs/ASSET_MANAGEMENT_SCHEMA_DESIGN.md` |
| 1 | `schema.ts` (+2 tables), `server.ts` (plugin seed + import) | `tests/asset-schema.test.ts` |
| 2 | `server.ts` (router mount + import) | `src/modules/assets/api/routes.ts`, `tests/asset-crud.test.ts` |
| 3 | `App.tsx`, `Layout.tsx`, `Home.tsx`, `Admin.tsx` (hierarchy + plugin check) | `AssetDashboard.tsx`, `Assets.tsx`, `AssetCategories.tsx` |
| 4 | `server.ts` (qc/inspection hook + import) | `tests/asset-grn-integration.test.ts` |
| 5 | `schema.ts` (+1 table), `routes.ts` | `tests/asset-depreciation.test.ts` |
| 6 | `routes.ts`, `server.ts` (notif. templates), `WorkflowDesigner.tsx`, `Admin.tsx` (badge) | `tests/asset-approval-workflow.test.ts` |
| 7 | `schema.ts` (+1 table), `routes.ts`, `WorkflowDesigner.tsx`, `server.ts` (notif.) | `AssetDetail.tsx`, `tests/asset-transfer.test.ts` |
| 8 | `schema.ts` (+1 table), `routes.ts` | `AssetMaintenance.tsx`, `tests/asset-maintenance.test.ts` |
| 9 | `schema.ts` (+1 table), `routes.ts`, `server.ts` (notif.) | `AssetDisposal.tsx`, `tests/asset-disposal.test.ts` |
| 10 | `AssetDashboard.tsx` | `reports.ts`, `AssetReports.tsx`, `tests/asset-reports.test.ts` |
| 11 | `schema.ts` (+2 tables), `routes.ts`, `Assets.tsx` | `AssetVerification.tsx` |
| 12 | `DEVELOPER_GUIDE.md`, `AGENTS.md` | — |

---

## Phase Dependency Map

```
Phase 0 (Design & Schema Doc)
  └→ Phase 1 (Schema + Plugin)
       └→ Phase 2 (CRUD API)
            ├→ Phase 3 (Frontend + Menu)
            └→ Phase 4 (GRN Auto-create)
                 └→ Phase 5 (Depreciation Engine)
                      └→ Phase 6 (Acquisition Approval Workflow)
                           ├→ Phase 7 (Transfer Workflow)
                           ├→ Phase 8 (Maintenance Tracking)
                           └→ Phase 9 (Disposal Workflow)
                                └→ Phase 10 (Reports & Dashboard)
                                     └→ Phase 11 (QR Audit — Optional)
                                          └→ Phase 12 (Hardening & Deploy)
```
