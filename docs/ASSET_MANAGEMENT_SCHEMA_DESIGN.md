# Asset Management — Database Schema & ERD Specification

This document details the database schema design and Entity-Relationship (ERD) relationships for the **Asset Management Module** in the SLI ERP system.

---

## 🏗️ 1. Multi-Tenancy & Integrity Constraints
- **Tenant Isolation**: All tables contain `companyId` referencing `companies.id`.
- **Cascade Directives**: Foreign keys referencing `users.uid` strictly specify `{ onUpdate: 'cascade' }`.
- **Naming Conventions**: `snake_case` in SQL / PostgreSQL, `camelCase` in Drizzle ORM schemas.

---

## 📊 2. Entity-Relationship & Schema Details

### 1. `asset_categories`
Stores fixed asset category definitions and default financial/depreciation configurations per company.

| Field Name | Type | Constraints / References | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, default `gen_random_uuid()` | Category Unique Identifier |
| `companyId` | UUID | FK `companies.id`, NOT NULL | Tenant Company ID |
| `name` | Text | NOT NULL | Category Name (e.g. IT Equipment, Vehicles, Office Furniture) |
| `code` | Text | NOT NULL | Short Code (e.g., `CAT-IT`, `CAT-VEH`) |
| `defaultDepreciationMethod` | Text | NOT NULL, default `'Straight Line'` | Straight Line / Declining Balance / None |
| `defaultUsefulLifeMonths` | Integer | NOT NULL, default `36` | Expected useful lifespan in months |
| `defaultSalvagePercent` | Numeric(5,2) | default `0.00` | Default residual value % |
| `fixedAssetAccount` | Text | Nullable | GL Fixed Asset Account code |
| `depreciationAccount` | Text | Nullable | GL Accumulated Depreciation Account code |
| `expenseAccount` | Text | Nullable | GL Depreciation Expense Account code |
| `status` | Text | NOT NULL, default `'Active'` | Category status (`Active` / `Inactive`) |
| `createdAt` | Timestamp | default `now()` | Record creation timestamp |
| `updatedAt` | Timestamp | default `now()` | Record last updated timestamp |

---

### 2. `assets`
Core fixed asset register table storing lifecycle state, valuation, assignment, and acquisition source.

| Field Name | Type | Constraints / References | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, default `gen_random_uuid()` | Asset Unique Identifier |
| `companyId` | UUID | FK `companies.id`, NOT NULL | Tenant Company ID |
| `assetCode` | Text | NOT NULL, Unique | Formatted Tag Code (`AST-YYYYMMDD-XXXX`) |
| `name` | Text | NOT NULL | Asset Title / Description |
| `categoryId` | UUID | FK `asset_categories.id`, NOT NULL | Asset Category |
| `branchId` | UUID | FK `branches.id`, Nullable | Assigned Physical Branch |
| `warehouseId` | UUID | FK `warehouses.id`, Nullable | Storage Warehouse (if unassigned) |
| `custodianUid` | UUID | FK `users.uid` `{ onDelete: 'set null', onUpdate: 'cascade' }` | Current custodian employee |
| `departmentId` | UUID | FK `departments.id`, Nullable | Owning Department |
| `acquisitionDate` | Timestamp | NOT NULL | Date of Purchase / In-service |
| `acquisitionCost` | Numeric(12,2) | NOT NULL | Purchase cost / capitalized value |
| `salvageValue` | Numeric(12,2) | NOT NULL, default `0.00` | Estimated residual value |
| `depreciationMethod` | Text | NOT NULL, default `'Straight Line'` | Straight Line / Declining Balance / None |
| `usefulLifeMonths` | Integer | NOT NULL, default `36` | Useful lifespan in months |
| `depreciationStartDate` | Timestamp | Nullable | Date depreciation calculations begin |
| `accumulatedDepreciation` | Numeric(12,2) | NOT NULL, default `0.00` | Total depreciation posted |
| `currentBookValue` | Numeric(12,2) | NOT NULL | Current net book value (`Cost - Accumulated`) |
| `status` | Text | NOT NULL, default `'Draft'` | `Draft` / `PendingApproval` / `Active` / `UnderMaintenance` / `Disposed` / `Sold` |
| `sourceType` | Text | NOT NULL, default `'Manual'` | `'Manual'` or `'GRN'` |
| `sourceGrnId` | UUID | FK `grn.id`, Nullable | Source GRN ID if converted from Inventory QC |
| `serialNumber` | Text | Nullable | OEM Serial Number / Chassis Number |
| `qrCode` | Text | Nullable | QR Code String / Data URI |
| `createdByUid` | UUID | FK `users.uid` `{ onDelete: 'set null', onUpdate: 'cascade' }` | Asset registrant |
| `createdAt` | Timestamp | default `now()` | Record creation timestamp |
| `updatedAt` | Timestamp | default `now()` | Record last updated timestamp |

---

### 3. `asset_depreciation_schedule`
Calculated period-by-period depreciation schedules for straight-line / declining balance posting.

| Field Name | Type | Constraints / References | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, default `gen_random_uuid()` | Schedule ID |
| `companyId` | UUID | FK `companies.id`, NOT NULL | Tenant Company ID |
| `assetId` | UUID | FK `assets.id` `{ onDelete: 'cascade' }`, NOT NULL | Target Fixed Asset |
| `periodNumber` | Integer | NOT NULL | Lifespan month index (1..N) |
| `periodDate` | Timestamp | NOT NULL | Depreciation period end date |
| `depreciationAmount` | Numeric(12,2) | NOT NULL | Period depreciation expense |
| `accumulatedDepreciation` | Numeric(12,2) | NOT NULL | Cumulative depreciation after this period |
| `bookValueAfter` | Numeric(12,2) | NOT NULL | Net book value after period posting |
| `status` | Text | NOT NULL, default `'Scheduled'` | `'Scheduled'`, `'Posted'`, `'Cancelled'` |
| `createdAt` | Timestamp | default `now()` | Creation timestamp |

---

### 4. `asset_transfers`
Audit log and approval records for moving custody or location of assets between branches and users.

| Field Name | Type | Constraints / References | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, default `gen_random_uuid()` | Transfer Request ID |
| `companyId` | UUID | FK `companies.id`, NOT NULL | Tenant Company ID |
| `assetId` | UUID | FK `assets.id` `{ onDelete: 'cascade' }`, NOT NULL | Target Fixed Asset |
| `fromBranchId` | UUID | FK `branches.id`, Nullable | Source Branch |
| `fromCustodianUid` | UUID | FK `users.uid` `{ onDelete: 'set null', onUpdate: 'cascade' }` | Former Custodian |
| `toBranchId` | UUID | FK `branches.id`, Nullable | Destination Branch |
| `toCustodianUid` | UUID | FK `users.uid` `{ onDelete: 'set null', onUpdate: 'cascade' }` | New Custodian |
| `reason` | Text | NOT NULL | Purpose for movement |
| `status` | Text | NOT NULL, default `'Pending'` | `'Pending'`, `'Approved'`, `'Rejected'`, `'Completed'` |
| `requestedBy` | UUID | FK `users.uid` `{ onDelete: 'set null', onUpdate: 'cascade' }` | Request initiator |
| `createdAt` | Timestamp | default `now()` | Request creation date |

---

### 5. `asset_maintenance`
Schedules and logs maintenance service events, work orders, costs, and vendor logs.

| Field Name | Type | Constraints / References | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, default `gen_random_uuid()` | Maintenance Record ID |
| `companyId` | UUID | FK `companies.id`, NOT NULL | Tenant Company ID |
| `assetId` | UUID | FK `assets.id` `{ onDelete: 'cascade' }`, NOT NULL | Target Fixed Asset |
| `maintenanceType` | Text | NOT NULL | `'Preventive'`, `'Corrective'`, `'Warranty'` |
| `vendorId` | UUID | FK `vendors.id`, Nullable | Service Vendor |
| `cost` | Numeric(12,2) | NOT NULL, default `0.00` | Maintenance expense cost |
| `scheduledDate` | Timestamp | NOT NULL | Planned maintenance date |
| `completedDate` | Timestamp | Nullable | Service completion date |
| `nextDueDate` | Timestamp | Nullable | Next servicing date requirement |
| `notes` | Text | Nullable | Details of work performed |
| `status` | Text | NOT NULL, default `'Scheduled'` | `'Scheduled'`, `'InProgress'`, `'Completed'`, `'Cancelled'` |
| `createdAt` | Timestamp | default `now()` | Log creation date |

---

### 6. `asset_disposals`
Records asset retirement, sale, scrap, or donation lifecycle events with automated Gain/Loss calculations.

| Field Name | Type | Constraints / References | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, default `gen_random_uuid()` | Disposal Request ID |
| `companyId` | UUID | FK `companies.id`, NOT NULL | Tenant Company ID |
| `assetId` | UUID | FK `assets.id` `{ onDelete: 'cascade' }`, NOT NULL | Target Fixed Asset |
| `disposalType` | Text | NOT NULL | `'Sale'`, `'Scrap'`, `'WriteOff'`, `'Donation'` |
| `disposalDate` | Timestamp | NOT NULL | Date asset retired |
| `saleAmount` | Numeric(12,2) | NOT NULL, default `0.00` | Proceeds from sale/scrap |
| `bookValueAtDisposal` | Numeric(12,2) | NOT NULL | Net book value at retirement |
| `gainLoss` | Numeric(12,2) | NOT NULL | Financial Gain (+) or Loss (-) |
| `approvedByUid` | UUID | FK `users.uid` `{ onDelete: 'set null', onUpdate: 'cascade' }` | Approving authority |
| `status` | Text | NOT NULL, default `'Pending'` | `'Pending'`, `'Approved'`, `'Completed'`, `'Rejected'` |
| `createdAt` | Timestamp | default `now()` | Record creation date |

---

## 🔗 3. Integration Points with Existing ERP Schema
1. **`inventory_items.isFixedAsset`**: Column already exists in `schema.ts` (L527). During GRN QC pass (Phase 4), items with `isFixedAsset = true` automatically trigger asset record creation in `assets`.
2. **`grn.id` → `assets.sourceGrnId`**: Connects assets created from inventory back to purchase & QC source documentation.
3. **`vendors.id` → `asset_maintenance.vendorId`**: Links maintenance services directly with vendor management profiles.
