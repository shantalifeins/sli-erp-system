# 🧪 SLI ERP System — Comprehensive End-to-End Test Case Suite

This document defines the complete Quality Assurance (QA) and Automated/Manual Test Case Specifications for the **SLI ERP System**. The suite is structured across **5 Core Phases**, providing step-by-step test execution procedures, pre-conditions, expected results, and priority tags (**P0 Blockers**, **P1 High Priority**, **P2 Medium Priority**).

---

## 📌 Test Execution Overview & Priority Codes

| Priority Tag | Description | Severity Level |
| :--- | :--- | :--- |
| **P0 (Critical)** | Core business workflow features (Auth, Approval Gateways, Stock Integrity, P2P Lifecycle). System unusable if failed. | Blockers |
| **P1 (High)** | Important functional features (Filters, Multi-tenant Isolation, Badges, QC Inspections). | High Impact |
| **P2 (Medium)** | UI polish, Searchable Dropdowns, Non-critical edge cases, Exporting reports. | Standard QA |

---

# 📑 Phase 1: Authentication, Multi-Tenancy & Authorization (RBAC)

### TC-AUTH-001: Native PostgreSQL Login Verification
- **Priority**: `P0`
- **Module**: Authentication (`/login`)
- **Pre-Conditions**: System set to `AUTH_MODE=postgres`.
- **Test Steps**:
  1. Navigate to `https://erp.shantalife.com/login`.
  2. Input valid registered email (`shantalifeins@gmail.com`) and password (`Admin@123456#`).
  3. Click **Sign In**.
- **Expected Result**:
  - System verifies PBKDF2 hash, issues a signed JWT token, stores `authToken` in `localStorage`.
  - User is routed to `/procurement-dashboard` without redirect loops.
  - Active session displays user name and Super Admin badge.

### TC-AUTH-002: Invalid Password & Security Rate Limiting
- **Priority**: `P1`
- **Module**: Authentication & Security
- **Test Steps**:
  1. Input a valid email with an incorrect password 5 consecutive times.
  2. Attempt a 6th login request within 60 seconds.
- **Expected Result**:
  - Express `express-rate-limit` triggers HTTP `429 Too Many Requests`.
  - UI displays error message: *"Too many login attempts. Please try again later."*

### TC-TENANT-003: Strict Multi-Tenant Data Isolation
- **Priority**: `P0`
- **Module**: Multi-Tenancy Engine
- **Pre-Conditions**: Two companies exist: Company A (`Shanta Life Insurance PLC`) and Company B (`Shanta Asset Management Limited`).
- **Test Steps**:
  1. Log in as a user assigned exclusively to Company A.
  2. Send API request to `/api/purchase-requisitions` with modified `x-tenant-id` header pointing to Company B.
- **Expected Result**:
  - `resolveTenantId(req)` restricts operations strictly to the user's assigned `companyId`.
  - API returns HTTP `403 Forbidden` or empty dataset filtered strictly by Company A. No cross-tenant data leakage occurs.

### TC-RBAC-004: Dynamic Role Permission Enforcement
- **Priority**: `P1`
- **Module**: User Panel & Admin Controls
- **Test Steps**:
  1. As Admin, navigate to **Admin Panel → Roles & Permissions**.
  2. Revoke `canView` for `Vendors` module from role `SLI Employee`.
  3. Log in as a user with `SLI Employee` role.
- **Expected Result**:
  - **Vendors** sidebar menu item disappears automatically (`Layout.tsx` checks `getPermission('Vendors')?.canView`).
  - Accessing `/vendors` directly via browser address bar routes user back to dashboard with permission denied notice.

---

# 📑 Phase 2: Global Inbox & Dynamic BPMN Approval Workflows

### TC-BPMN-001: Dynamic Workflow Execution (PR Approval Flow)
- **Priority**: `P0`
- **Module**: Global Inbox (`/inbox`) & BPMN Engine
- **Pre-Conditions**: A BPMN approval definition exists for `PR` with Step 1 = `Head of Ops`, Step 2 = `CFO`.
- **Test Steps**:
  1. Employee submits a Purchase Requisition (`PR-2026-001`).
  2. Log in as `Head of Ops` and navigate to `/inbox`.
  3. Select `PR-2026-001` and click **Approve**.
  4. Log in as `CFO` and navigate to `/inbox`.
  5. Select `PR-2026-001` and click **Approve**.
- **Expected Result**:
  - Step 1 approval updates `pr_approvals` status to `Approved` and advances instance to Step 2.
  - Step 2 approval sets final PR status to `Approved`.
  - `inbox_tasks` records for `PR-2026-001` are updated to status `'Completed'`.

### TC-INBOX-002: Inbox Task Completion on Action
- **Priority**: `P0`
- **Module**: Global Inbox (`/inbox`)
- **Test Steps**:
  1. Submit a document triggering multiple approvers or role fallback.
  2. Action (Approve/Reject) the document task as one of the valid approvers.
- **Expected Result**:
  - Backend queries `inbox_tasks` by `referenceType` and `referenceId` (without restricting by `assignedToUid`) and marks ALL pending tasks for that document step as `'Completed'`.
  - Pending badge count on `/inbox` sidebar updates dynamically.

### TC-INBOX-003: Approver Fallback to Super Admin
- **Priority**: `P1`
- **Module**: Workflow Approvals
- **Pre-Conditions**: No user is assigned to a specified approval department/role.
- **Test Steps**:
  1. Trigger an approval workflow step requiring a non-existent role/designation.
  2. Log in as `Super Admin` and check `/inbox`.
- **Expected Result**:
  - `notifyApprovers` creates a fallback `inbox_tasks` entry with `assignedToRole: 'Super Admin'` and `assignedToUid: null`.
  - Super Admin can action the task directly from Global Inbox without workflow blockage.

---

# 📑 Phase 3: Procure-to-Pay (P2P) Procurement Lifecycle

### TC-P2P-001: Purchase Requisition (PR) Creation & Partial Fulfilment Deduplication
- **Priority**: `P0`
- **Module**: Procurement (`/purchase-requisitions`)
- **Test Steps**:
  1. Create a Requisition for 100 Laptop Units.
  2. Create a PR sourcing 40 units from the Requisition.
  3. Attempt to create another PR from the same Requisition.
- **Expected Result**:
  - Available item quantity recalculates dynamically as: `quantity - deliveredQuantity - prCreatedQuantity` (60 units remaining).
  - Form validation prevents over-requisitioning beyond remaining quantity.

### TC-P2P-002: Request for Quotation (RFQ) Vendor Bidding & Exclusion Filtering
- **Priority**: `P1`
- **Module**: RFQ & Vendors (`/rfq`)
- **Test Steps**:
  1. Open **Create RFQ** modal.
  2. Click PR selection dropdown.
- **Expected Result**:
  - Dropdown displays rich context: `PR Number — Vendor/Requester — Item Summary`.
  - Approved PRs already converted to RFQs are excluded via **Lifecycle Exclusion Filtering** (`!hasRfq`).

### TC-P2P-003: Comparative Statement (CS) Amount Gateway Verification
- **Priority**: `P0`
- **Module**: CS Evaluation (`/cs`)
- **Test Execution Matrix**:
  - **Scenario A (≤ 5,000 BDT)**: Requires approval from **Head of Ops** only.
  - **Scenario B (5,001 – 100,000 BDT)**: Requires approval from **Head of Ops → CEO**.
  - **Scenario C (> 100,000 BDT)**: Requires approval from **Head of Ops → CEO → Executive Committee (EC)**.
- **Expected Result**:
  - Workflow engine dynamically evaluates exclusive threshold gateways and routes approval tasks to appropriate inbox roles.

### TC-P2P-004: Form Double-Submit Prevention
- **Priority**: `P1`
- **Module**: Procurement Forms (PR, RFQ, PO, Invoice)
- **Test Steps**:
  1. Fill out a new Purchase Order form.
  2. Rapidly double-click the **Submit Purchase Order** button.
- **Expected Result**:
  - `isSubmitting` state guard immediately disables the submit button on first click.
  - Exactly 1 POST network request is dispatched; duplicate database records are prevented.

---

# 📑 Phase 4: Inventory Management, QC & Warehouse Operations

### TC-INV-001: Goods Receipt Note (GRN) & QC Inspection Locking
- **Priority**: `P0`
- **Module**: Inventory & QC (`/grn`, `/qc-inspection`)
- **Test Steps**:
  1. Create a GRN for 10 IT Equipment items received from vendor.
  2. Submit QC Inspection: 7 Passed, 3 Held.
- **Expected Result**:
  - Passed items (7) are locked into stock immediately.
  - UI displays visual badges: `✓ Passed (7 In Stock)` (Green) and `⚠️ Hold (3)` (Yellow).

### TC-INV-002: QC Re-Inspection Modal Scoping
- **Priority**: `P1`
- **Module**: Quality Control Inspection
- **Test Steps**:
  1. Open **Re-inspect Hold** modal for the held items from TC-INV-001.
- **Expected Result**:
  - Modal is strictly scoped to the remaining 3 held items only (cannot alter previously passed items).
  - Inspecting 2 passed units updates stock incrementally: `newlyPassed = passedQty - previousPassedTotal` (+2 units to stock ledger).

### TC-INV-003: Warehouse Manager Scoping & Multi-Warehouse Control
- **Priority**: `P1`
- **Module**: Warehouse Management (`/warehouses`)
- **Pre-Conditions**: Non-admin user mapped in `warehouse_managers` to "Dhaka Central Warehouse" (IT items only).
- **Test Steps**:
  1. Log in as assigned Warehouse Manager.
  2. Attempt to view or manage stock in "Chittagong Warehouse".
- **Expected Result**:
  - System limits access strictly to "Dhaka Central Warehouse" and IT item category. Administrative items or unassigned warehouses are hidden.

---

# 📑 Phase 5: Administration, System Settings & Infrastructure

### TC-ADM-001: System Settings & Logo Base64 Storage
- **Priority**: `P1`
- **Module**: Admin Configuration (`/admin?tab=settings`)
- **Test Steps**:
  1. As Super Admin, navigate to **Admin → System Settings**.
  2. Upload a new Primary WebP Logo and Favicon PNG.
  3. Save Settings.
- **Expected Result**:
  - Logo/Favicon are saved to `system_settings` as base64 data URIs.
  - Top header logo (`Logo.tsx`) updates instantly across all views.

### TC-ADM-002: Foreign Key Cascade Protection (`users.uid`)
- **Priority**: `P0`
- **Module**: Database Integrity
- **Test Steps**:
  1. Inspect PostgreSQL foreign keys referencing `users.uid`.
- **Expected Result**:
  - All foreign keys specify `{ onUpdate: 'cascade' }`. If Supabase Auth / GoTrue UIDs mutate, PostgreSQL updates dependent records without crashing.

### TC-ADM-003: Dynamic Currency Display
- **Priority**: `P2`
- **Module**: Settings & UI Conventions
- **Test Steps**:
  1. Change system currency in Settings from `BDT ৳` to `USD $`.
  2. Inspect PR, PO, CS, and Invoice list pages.
- **Expected Result**:
  - `useCurrency()` hook dynamically formats amounts as `$100.00` instead of hardcoding `৳`.

---

## 🚀 Recommended Automated Testing Pipeline

To execute this test suite in continuous integration (CI/CD):

```bash
# 1. Run Unit Tests (Components & Utilities)
npm run test:unit

# 2. Run API Integration Tests (Express API & RBAC)
npm run test:api

# 3. Run End-to-End Browser Automation (Playwright/Cypress)
npx playwright test
```
