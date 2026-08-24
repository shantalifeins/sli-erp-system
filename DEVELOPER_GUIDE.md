# 🚀 Developer Guide & System Architecture

Welcome to the **SLI ERP System**! This comprehensive guide provides developers with an optimized, structured overview of the system architecture, multi-tenant isolation, dynamic BPMN workflows, database schema, and core business lifecycles.

---

## 🏗️ 1. Technology Stack & Multi-Tenancy Architecture

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express (TypeScript), Drizzle ORM
- **Database**: PostgreSQL (hosted on Supabase for local/Vercel; native PostgreSQL for Live Server).
- **Auth**: Dual-Authentication Architecture (`AUTH_MODE=supabase` for Supabase JWT; `AUTH_MODE=postgres` for Direct Express JWT Auth with native password verification).
- **Native Login Endpoint**: `/api/auth/login` verifies credentials directly against `users.password_hash` and issues signed JWT tokens offline.
- **Key Libraries**: `bpmn-js` (Visual BPMN Modeler), `lucide-react` (Iconography), `@azure/msal-browser` (Microsoft SSO).

### Multi-Tenancy Model
- **Tenant Isolation**: Almost all tables contain a `companyId` (UUID) column.
- **Middleware**: API requests parse the `x-tenant-id` header via `resolveTenantId(req)` in `server.ts` to restrict database queries strictly to the active company. Cross-tenant fallbacks are prohibited.
- **Role Isolation**: RBAC tables (`roles`, `role_permissions`) enforce a compound unique constraint (`companyId` + `name`) to prevent global role name collisions.
- **Role Permission Customization**: The `hierarchy` array in `Admin.tsx` maps each menu strictly to the actions it supports in the frontend/backend. Toggling a module or menu level checkbox automatically checks all corresponding nested actions for rapid onboarding.

### 🔒 Git Repository Isolation Rules
- **Workspace Scoping**: This codebase is strictly mapped to repository `https://github.com/shantalifeins/erp.git`.
- **Pre-Push Safety Check**: Before pushing commits, agents must run `git remote -v` to confirm the destination is strictly `shantalifeins/erp.git` to avoid cross-project contamination across multiple projects under the same GitHub account.

---

## 🔌 2. Plugin Architecture & Module Feature Flagging

- **Plugin Registry**: Modules (Procurement, Inventory, User Panel, Admin) are registered in the `plugins` table.
- **Company Feature Flagging**: `company_plugins` maps enabled modules per company tenant.
- **Route Guard**: The `PluginProtectedRoute` frontend component checks `company_plugins` before rendering module routes.
- **Seed Guard**: On server startup (`server.ts`), core plugins are auto-seeded if missing.

---

## 🧭 3. Navigation & Module Sidebar Routing

### Sidebar Matching Rule (`Layout.tsx`)
The sidebar navigation determines the active module using `path.startsWith()` and exact string checks. Sub-routes MUST be covered to prevent sidebars from disappearing:

| Module | Active Route Matching | Sidebar Items |
| :--- | :--- | :--- |
| **User Panel** | `/user-dashboard`, `/inbox`, `/my-tasks`, `/item-requisition`, `/profile` | Dashboard, Global Tasks (`/inbox`), Item Requisitions, My Profile |
| **Administration** | `/admin/**` | System Settings (Companies, Workflows), User Settings (Depts, Units, Designations, Roles, Users, Org Chart) |
| **Procurement** | `/procurement-dashboard`, `/purchase`, `/wo`, `/vendors`, `/rfq`, `/cs`, `/invoices`, `/procurement-report` | Dashboard, Purchase Requisitions, RFQ, Comparative Statement, Purchase Orders, Invoices & Payments, Reports |
| **Inventory** | `/inventory-dashboard`, `/inventory`, `/grn`, `/qc`, `/stock-*`, `/requisition-list`, `/inventory-report` | Dashboard, Requisition List, Stock In, Stock Out, Stock Transfer, Transfer Receive, Goods Receipt (GRN), Inventory Reports, Inventory Settings |

> [!IMPORTANT]
> - **Inbox-Based Approvals**: All actionable decisions (Approve, Reject, Send Back) occur directly in **User Panel → Global Inbox** (`/inbox`). Public pages like `/requisition-list` remain read-only.
> - **Local Header Back Navigation**: All "Add", "Edit", or "View" views implement local header back buttons (`<ArrowLeft />`) to hide form views (`setShowForm(false)`) and restore list tables.

---

## 💾 4. Database Schema Domains (Drizzle ORM)

Located in `src/shared/db/schema.ts`:

### Core Domains
- **Identity & Org**: `companies`, `branches`, `warehouses`, `users` (synced via `uid`, foreign keys specify `{ onUpdate: 'cascade' }`), `departments`, `units`, `designations`, `roles`, `role_permissions`.
- **Workflow & Tasks**: `bpmn_definitions` (`documentType` + `companyId`), `document_approvals`, `pr_approvals`, `inbox_tasks` (`referenceType`, `referenceId`, `assignedToRole`, `assignedToUid`, `actionResult`).
- **Inventory & Warehouse Stock**: `inventory_items` (`isAdminItem`, `isItItem`, `quantityInStock`, `basePrice`), `item_categories`, `warehouse_stock`, `warehouse_managers`, `global_stock_ledger`, `stock_transactions`, `stock_transfers`.
- **Procurement (P2P)**: `purchase_requisitions`, `pr_items`, `vendors` (includes banking details), `rfqs`, `quotations`, `comparative_statements`, `cs_items`, `vendor_evaluations`, `purchase_orders`, `po_items`, `grn`, `grn_items`, `qc_inspections`, `invoices`, `payments`.

---

## ⚙️ 5. Dynamic BPMN Workflow Engine & Inbox Scoping

### BPMN Workflow Designer & Execution
- **Design & Evaluation**: Admins draw workflows in `WorkflowDesigner.tsx` for specific `documentType` records. Upon document submission, `evaluateWorkflowPath` parses the BPMN XML to generate approval steps.
- **Designation & Role Routing**: Approval steps map to specific roles or designations. If a step targets a "Department Head", the engine resolves `managerUid` from the requester's `departments` record.
- **Branch-Scoped Approver Lookup**: `notifyApprovers` searches for approvers matching the requester's `branchId`. If no employee is assigned in that branch, it falls back to company-wide matching or an unassigned task for Super Admins.
- **Inbox Role vs. Designation Matching**: `/api/inbox` queries use `or(eq(inbox_tasks.assignedToRole, userRole), eq(inbox_tasks.assignedToRole, userDesignation))` so tasks assigned by designation appear in the user's inbox.
- **Inbox Task Clearing**: Processing an approval step marks ALL pending `inbox_tasks` for that document as `'Completed'` across all users.

---

## 👤 6. User Onboarding & Profile Change Lifecycle

### User Registration (SSO & Admin Creation)
- Runs dynamically via `documentType: 'User Registration'`.
- Requester status remains `Pending HR Approval` during intermediate steps.
- On the **final approval step** (`isFinalStep`), the inbox UI enforces mandatory assignment of `Role`, `Branch`, `Department`, and `Designation`.
- Final approval updates status to `Active` and syncs credentials with Supabase Auth (`GoTrue`).

### Profile Data Change Requests
- Runs dynamically via `documentType: 'Profile Data Change Request'`.
- Intermediate approvers review requested profile edits.
- The **final approver** can view, edit, or override fields before final approval auto-merges changes into `users`.

---

## 🛒 7. Procurement Lifecycle (P2P) & Vendor Management

### Procurement Workflow Steps
1. **Purchase Requisition (PR)**: Created from Item Requisition List or manually. Specifies procurement method ('Single Quotation', 'Minimum 3 Quotations', 'RFQ with CS', 'Tender/RFP'). Approval flows through Operations Head → CFO.
2. **RFQ & Quotations**: Invites vendors, captures item prices, delivery days, VAT%, TAX%, and base64 quotation attachments (`attachment_url`).
3. **Comparative Statement (CS)**: Generates a quote comparison matrix. Evaluates 7 vendor criteria (Price, Quality, Timeline, Experience, Warranty, Stability, Compliance). Sequential approval gateways route based on Grand Total:
   - **≤ 5,000 BDT**: Head of Operations.
   - **5,001 – 100,000 BDT**: Head of Operations → CEO.
   - **> 100,000 BDT**: Head of Operations → CEO → EC Committee.
4. **Purchase Orders (PO)**: Generates directly from approved CS.
5. **Work Orders (WO)**: Auto-generates upon CS approval (`/work-orders`). Features pre-print customization (delivery address, contact person, numbered terms 1-7), branded Shanta Life Insurance PLC A4 PDF format with QR code (`/assets/wo_qr_code.png`) and footer bar (`/assets/wo_footer_bar.png`), signed document upload (`Signed & Active` status), and a **GRN Security Guard** (`🔒 Signed Work Order Required`) that strictly blocks GRN creation for POs without an uploaded signed Work Order.
6. **Vendor Profiles**: Stores contact info, tax IDs (BIN, TIN), and full banking details (`bank_name`, `branch_name`, `account_name`, `account_number`, `routing_number`).

---

## 📦 8. QC Inspection, Stock Ledgers & Enterprise Inventory Operations

- **Item Name Resolution**: `GET /api/grn` joins `po_items` onto `grn_items` to return `itemName`, `uom`, and unit prices.
- **Partial Inspection Badges**: `Grn.tsx` renders separate badges for accepted items (`✓ Passed (In Stock)`) and held items (`⚠️ Hold`).
- **Locked Passed Quantities**: Previously passed items are locked into stock and marked ready for payment.
- **Held-Only Re-inspection Modal**: Clicking **"Re-inspect Hold (Qty)"** opens a modal strictly scoped to held items (`🔒 Passed & Locked | ⚠️ Currently Held`), allowing newly passed items to be audited when vendor replacements arrive.
- **Incremental Stock Ledger Updates**: `POST /api/qc/inspection` calculates `newlyPassed = passedQty - previousPassedTotal`. Only newly passed items increment:
  1. `inventory_items.quantityInStock`
  2. `warehouse_stock.quantity`
  3. `global_stock_ledger.totalStockIn` & `closingBalance`

### Enterprise Inventory Gap Remediation (Phases 1-3)
- **Stock Reservation Engine (`stock_reservations`)**: Soft-locks requested stock upon pending stock-out creation to prevent double allocation. Final approval verifies `quantityInStock - reservedQuantity`, releases reservation, and records demand history in `stock_consumption_history`.
- **Physical Stock Reconciliation (`/stock-reconciliation`)**: Full physical audit lifecycle (`physical_stock_counts`, `physical_count_details`, `stock_adjustments`). Allows spot checks/cycle counts, variance logging with reason codes (Theft, Damage, Entry Error), and 1-click approval to auto-apply adjustments to warehouse and global stock.
- **QC Rejected Items & Disposition Management (`/rejected-items`)**: Auto-creates `rejected_item_dispositions` when QC inspections fail (`failedQty > 0`). Provides action UI for Return to Vendor (Credit Note # tracking), Scrap, and Rework workflows.
- **Automated Reorder PR Generation**: `POST /api/inventory/auto-reorder/generate-pr` converts low-stock items (`quantityInStock <= reorderPoint`) into a Draft Purchase Requisition with 1-click trigger from `InventoryDashboard.tsx`.
- **In-Transit Shipment Tracking**: Stock Transfer approvals set status to `In Transit` and record `dispatchDate` while deducting source warehouse stock. Destination receipt updates status to `Received` and sets `actualArrivalDate`.
- **Weighted Average Costing (WAC)**: On each GRN QC pass, recalculates unit cost: `New WAC = ((Current Qty * Current WAC) + (Received Qty * Purchase Price)) / Total Qty` and updates `inventory_items.basePrice`.
- **Vendor Quality Scorecard**: Auto-calculates `vendor_quality_metrics` (`qualityScore = (Passed / Total) * 10`, `rejectionRate`) and displays quality rating badges (e.g. ⭐ 9.8 / 10) on `Vendors.tsx`.

---

## 🎨 9. UI Conventions, Descriptive Dropdowns & Exclusion Filters

- **Mandatory Red Asterisk**: HTML5 `required` attribute triggers CSS `label:has(+ *:required)::after` to append red asterisks automatically.
- **Descriptive Entity Dropdowns**: Select dropdowns across all modules display rich context (`Number — Vendor (PO/PR) - Item Summary (Qty Pcs)`).
- **Lifecycle Exclusion Filtering**: Entity selection dropdowns filter out records that have already advanced to the next lifecycle stage:
  - **RFQ Dropdowns**: Excludes PRs with existing RFQs (`!hasRfq`).
  - **CS Dropdowns**: Excludes RFQs with existing CS records (`!hasCs`).
  - **PO Dropdowns**: Excludes CS records with existing POs (`!hasPo`).
  - **GRN Dropdowns**: Excludes POs with existing GRNs or marked Delivered (`!hasGrn`).
  - **Invoice Dropdowns**: Excludes GRNs with existing Invoices (`!hasInvoice`).
- **Dynamic Currency**: Always use `useCurrency()` hook for `{currencySymbol}` prefixing.

---

## 🔔 10. Notification System & Production Deployment Guide

### Notification Engine
- Templates managed dynamically in `notification_settings` table via `DEFAULT_NOTIFICATION_TEMPLATES` in `server.ts`.
- Dispatches web notifications and SMTP emails using `nodemailer` with dynamic bracket placeholders (`[document_type]`, `[approver_name]`).

### Production Deployment Requirements
1. **Node.js (18 LTS / 20 LTS)** & **PM2** (`pm2 start dist/server.cjs --name sli-erp`).
2. **Nginx Reverse Proxy**: Serves Vite static build (`dist/`) and proxies `/api` to port 3000.
3. **SSL (Certbot / Let's Encrypt)**: Mandatory for HTTPS cookie security and SSO.
4. **PostgreSQL (Supabase or Self-Hosted Postgres 15+)**.
