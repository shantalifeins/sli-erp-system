# 🚀 Developer Guide & System Architecture

Welcome to the **SLI ERP System**! This guide is designed to help new developers quickly understand the architecture, database structure, and core workflows of the application.

## 🏗️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express (TypeScript), Drizzle ORM
- **Database**: PostgreSQL (hosted on Supabase)
- **Authentication**: Supabase Auth (JWT) verified against database status (users with 'Inactive' status are rejected with 403 Forbidden at API level, triggering immediate frontend logout).
- **Specialty Libraries**: 
  - `bpmn-js`: For the visual drag-and-drop Workflow Designer
  - `lucide-react`: For iconography

---

## 🏛️ Core Architecture Principles

### 1. Multi-Tenancy (SaaS Model)
The system is built as a multi-tenant SaaS application. Almost every table in the database contains a `companyId` (UUID) column.
- **Middleware**: API requests pass through the `resolveTenantId` logic in `server.ts` which extracts the `x-tenant-id` header to ensure data isolation.
- **Super Admins**: Users with the "Super Admin" role can access the "SaaS Admin" dashboard to provision new companies and switch between tenants dynamically.

### 2. Plugin Architecture
Features are modularized using a Plugin System.
- The `plugins` table defines available modules (e.g., Procurement, Inventory, User Panel).
- The `company_plugins` table tracks which modules are active for a specific company, allowing feature-flagging per tenant.
- **Auto-seeding**: On server startup (`server.ts`), a seed check ensures core plugins like `user-panel` exist in the `plugins` table.
- **Route guard**: `PluginProtectedRoute` (frontend) checks `company_plugins` before rendering any plugin-specific page.

### 3. Smart Organogram & Workflow Engine
The system moves beyond hard-coded approvals using a **Dynamic BPMN Engine**:
- **Design Phase**: Admins use the visual BPMN modeler to draw approval workflows for specific documents (e.g., "Item Request"). They assign roles/designations to User Tasks.
- **Execution Phase**: When a document is submitted, the backend parses the BPMN XML using `evaluateWorkflowPath` and generates linear approval steps (`pr_approvals` or `document_approvals`).
- **Dynamic Flow Visualization**: The `Approval Workflows` list dynamically parses and displays the sequential paths configured inside the BPMN XML as **Flow Paths** (e.g. `Path 1: EVP & Head of Operations -> CEO`), maps each workflow to its active **Module**, and provides a **Trigger Event** description of when it executes.
- **Smart Routing**: 
  - If a step requires a **"Department Head"** (or Unit Head), the system checks the document's department, looks up the `managerUid` in the `departments` table, and routes the approval strictly to that manager.
  - If it's a global role (e.g., "Managing Director") or a specific **Designation**, it checks the user's `role` and `designation`.

---

## 🧭 Navigation & Module Structure

  // User Panel paths must be checked FIRST to avoid /profile matching /item-requisition
  if (path.startsWith('/inbox') || path.startsWith('/my-tasks') || path.startsWith('/profile') || path === '/item-requisition' || path.startsWith('/item-requisition/')) {
    activeModule = 'user-panel';
    activeModuleName = 'User Panel';
  } else if (path === '/procurement-dashboard' || path.startsWith('/pr-') || path.startsWith('/purchase') || path.startsWith('/vendors') || path.startsWith('/rfq') || path.startsWith('/cs') || path.startsWith('/invoices')) {
    activeModule = 'procurement';
    activeModuleName = 'Procurement';
  } else if (path === '/inventory-dashboard' || path.startsWith('/inventory') || path.startsWith('/grn') || path.startsWith('/qc') || path.startsWith('/stock')) {
    activeModule = 'inventory';
    activeModuleName = 'Inventory Management';
  } else if (path.startsWith('/admin')) {
    activeModule = 'admin';
    activeModuleName = 'Administration';
  }

  // Define menus for each module
  const procurementMenus = [
    { name: 'Dashboard', href: '/procurement-dashboard', icon: LayoutDashboard, show: isSuperAdmin || getPermission('Dashboard')?.canView },
    { name: 'Requisition List', href: '/requisition-list', icon: Shield, show: isSuperAdmin || getPermission('Requisition Approval')?.canView },
    ...
  ]

### Sidebar Menu Structure per Module

| Module | Routes that activate it | Sidebar Items |
|--------|------------------------|---------------|
| **User Panel** | `/user-dashboard`, `/inbox`, `/my-tasks`, `/item-requisition`, `/profile` | Dashboard (`/user-dashboard`), Global Tasks (`/inbox`), Item Requisitions (`/item-requisition`), My Profile (`/profile`) |
| **Administration** | `/admin/**` | System Setting (Companies, Workflows), User Setting (Dept, Unit, Designation, Roles, Users, Org Chart) |
| **Procurement** | `/procurement-dashboard`, `/purchase`, `/wo`, `/vendors`, `/rfq`, `/cs`, `/invoices`, `/procurement-report` | Dashboard, Purchase Requisitions, RFQ, Comparative Statement, Purchase Orders, Invoices & Payments, Reports (Procurement Report) |
| **Inventory** | `/inventory-dashboard`, `/inventory`, `/grn`, `/qc`, `/stock-*`, `/requisition-list`, `/inventory-report` | Dashboard, Requisition List (`/requisition-list`), Stock In, Stock Out, Stock Transfer, Transfer Receive, Goods Receipt (GRN), Reports (Inventory Report), Inventory Setting (Item Categories, Inventory Items, Vendors) |

> [!NOTE]
> 1. The sidebar (`Layout.tsx`) uses `path.startsWith()` matching to set `activeModule`. Order of checks matters — `/inbox` and `/item-requisition` are checked first.
> 2. **Inbox-based Approval:** The actual approval decision (Approve, Reject, Send back for Review) happens directly in the **User Panel → Inbox** (`/inbox`). Requisition approval tasks land in the inbox of the authorized employee dynamically based on BPMN gateway and assignment conditions.
> 3. **Requisition List:** The page `/requisition-list` has been renamed to **Requisition List** (formerly Pending Requisition List). It is a read-only list for admins and managers to track current approval workflows. It displays PRs that are in `Pending Approval` OR `Draft` (only if the PR has a `Review` entry in `pr_approvals`). It dynamically displays "Pending With: Requestor (Revision)" for items sent back for review.
> 4. **Local Back Navigation:** The global header back button in `Layout.tsx` has been removed. All "Add", "Edit", and "View" forms/modals must implement their own context-aware local back button in the form header using the `<ArrowLeft className="w-5 h-5" />` icon (imported from `lucide-react`). The list views must be conditionally hidden when these forms are active to ensure a clean UI (e.g. `{!showForm && (<ListView />)}`). Clicking the local back button should simply reset the form visibility state (e.g. `setShowForm(false)` or `setSelectedItem(null)`). Do not rely on browser history or global navigation to exit form views.
> 5. **Simplified Requisitions:** To reduce user friction, `estimatedCost` and `estimatedPrice` fields have been completely removed from the frontend UI (PR creation, approval lists, Global Task inbox). The backend schema retains the `estimatedCost` `numeric().notNull()` constraint, so the frontend payload silently defaults these fields to `0`.
> 6. **Mandatory Field UI:** Forms should not manually apply `<span className="text-red-500">*</span>` to labels. A global CSS rule (`label:has(+ *:required)::after`) is in place to automatically append the red asterisk if the next sibling `<input>` or `<select>` has the HTML5 `required` attribute.
> 7. **Item Type Tags:** When displaying items in any list or approval view (e.g., Requisition List, Stock In/Out, Global Inbox), if an item is an `isAdminItem` or `isItItem`, a distinct badge (`ADMIN` in blue, `IT` in purple) must be rendered next to the item name. The `basePrice` is also an optional attribute tracked per UOM.
> 8. **PR Fulfillment Tracking:** When a PR is partially fulfilled, the remaining items can be issued to a new PR. To prevent duplicate PR creation, the system tracks `pr_created_quantity` on the original `pr_items`. Once all requested items are either delivered or pushed to a new PR, the original PR is marked 'Fully Delivered' and disappears from pending lists.
> 9. **Dynamic Currency Symbol:** Do not hardcode currency symbols like `$` or `৳` anywhere in the UI. The system supports tenant-wise currency configuration. Always import `useCurrency` from `SettingsProvider` and prepend `{currencySymbol}` to monetary values (e.g. `{currencySymbol}{amount.toLocaleString()}`).
> 10. **Warehouse Manager Item Type Scoping:** Warehouse managers can be assigned a specific `itemType` ('Admin', 'IT', or 'Both'). They can only perform Stock In, Stock Out, or Stock Transfer operations for items that match their assigned type. Furthermore, they can only view history records corresponding to the items they manage.
> 11. **Mixed PRs/POs Prevented:** Mixed item requisitions (combining Admin and IT items) are strictly prohibited. Purchase Requisitions and Stock Transfers must be separated by item type to streamline department-specific workflows.
---

## 💾 Database Schema (Drizzle ORM)

The database schema is defined in `src/shared/db/schema.ts`. Here are the core domains:

### Identity & Organization
- `companies`: The tenant root table.
- `branches`: Locations or sub-units belonging to a company, supporting tenant isolation.
- `warehouses`: Storage locations linked to a specific company and branch for tracking inventory.
- `users`: Synced with Supabase Auth via `uid`. Stores email, role, designation, and department. Includes a mandatory `branchId` mapping the user to a specific branch for organizational grouping.
- `roles` & `role_permissions`: Granular RBAC (Role-Based Access Control) for module-level access. Note: These are strictly scoped by `companyId` (compound unique constraint on `companyId` + `name`), enabling true multi-tenancy without global role collision. The "User Panel" module is also dynamically tied into this RBAC system.
- `departments` & `units`: Forms the hierarchical organogram. Contains `managerUid` to link a specific user as the head of that node.
- `designations`: Lookup table for employee job titles.

### User Panel Module
- `user_panel_settings`: Stores **global task templates** per company (e.g., recurring tasks like "Monthly Audit"). Fields: `taskKey`, `taskName`, `defaultAssigneeUid`, `isActive`.
- `user_panel_permissions`: Per-user access control flags (`canView`, `canEdit`, `canAdmin`) for the User Panel module.
- `inbox_tasks`: Individual task items assigned to specific users (`assignedToUid`). These are created programmatically by workflows or other modules. Fields include `category`, `title`, `message`, `actionLink`, `referenceType`, `referenceId`, `status`, and `actionResult` (stores the final action taken: Approved, Rejected, Review).

> [!IMPORTANT]
> The **User Panel → Global Tasks** page (`/inbox`) calls `GET /api/inbox` and shows tasks from `inbox_tasks` filtered by `assignedToUid` OR `assignedToRole` (for role-based fallbacks).
> The `/api/inbox` route dynamically deduplicates tasks based on `referenceType` and `referenceId` (keeping only the most recent) so users do not see cluttered history loops (e.g. Sent for Review followed by Approved) for the same document in the 'Completed' tab.
> It also merges status fields from referenced entities (e.g. `prStatus` from `purchase_requisitions`) to let the frontend render decision outcome badges in real time.
> The **User Panel → My Tasks** page (`/my-tasks`) has been **redirected** to `/inbox` for a unified task inbox experience.

### The Procurement Lifecycle (P2P)
This is the core flow of the system:

**Item Requisition (IR) → Purchase Requisition (PR) → RFQ → Vendor Evaluation/CS → PO → GRN → QC → Inventory → Delivery**

#### Full Lifecycle Flow
1. **Item Requisition (IR)**: User creates an IR via User Panel. Approved via BPMN (Department Head).
2. **Purchase Requisition (PR)**: Created from Inventory Requisition List when items are not in stock. `sourceIrId` links the PR back to the original IR. Price per item is **mandatory**. User manually selects `procurementMethod` (Single Quotation, Minimum 3 Quotations, RFQ with CS, Tender/RFP). Approved via BPMN "Purchase Requisition" workflow: Head of Operations → CFO (2-step designation-based approval).
3. **RFQ**: Created from approved PRs. Vendors are invited and submit quotations.
4. **Vendor Evaluation & CS**: 7-criteria weighted scoring (Price, Quality, Delivery Timeline, Vendor Experience, Warranty & Support, Financial Stability, Compliance Requirement). Scored via `vendor_evaluations` table. CS submitted for approval via BPMN "CS Evaluation" workflow with amount-based routing: ≤5000 BDT → Head of Operations, 5001-100000 BDT → CEO, >100000 BDT → EC Committee.
5. **PO**: Purchase Order created from approved CS. Handles both goods and services.
6. **GRN + QC**: Goods received against PO, quality inspected. QC pass → stock updated, QC fail → held.
7. **Delivery**: Stock now available in Requisition List for delivery to original requester.

## Form Submissions and File Handling
1. **Item Requisitions (IR)**: Handled natively in React Hook Form. Items are stored as an array of objects and inserted into `pr_items`. Triggers BPMN engine (`evaluateWorkflowPath`) with documentType 'Item Requisition' to create `pr_approvals` steps and `inbox_tasks` for the first step.
2. **Purchase Requisitions (PR)**: Created from Inventory Requisition List with mandatory item prices. Triggers BPMN engine with documentType 'Purchase Requisition' to create `pr_approvals` steps (Head of Operations → CFO). Links to source IR via `sourceIrId`.
3. **Stock Out Requests**: Item requests are scoped by `warehouseId`. Filters items to ensure availability in `warehouse_stock`. Triggers BPMN engine (`evaluateWorkflowPath`) to create `document_approvals` (`documentType: 'Stock Out'`) and single `inbox_tasks` for the first step.
4. **CS Evaluation Approval**: Triggers BPMN engine with documentType 'CS Evaluation'. Amount-based conditional sequential routing via exclusive gateway:
   - ≤ 5000: Head of Operations
   - 5001 - 100000: Head of Operations -> CEO
   - \> 100000: Head of Operations -> CEO -> EC Committee
   The amount evaluated is specifically dynamically calculated from the user's selected Winning Vendor during the evaluation modal.
5. **Receipts (GRN)**: Submits arrays of received items which interact directly with `global_stock_ledger`.

### Database Tables (P2P)
1. `purchase_requisitions` (PR): Internal requests for items. Links to `pr_items`. New columns: `sourceIrId`, `procurementMethod`.
2. `rfq` (Request for Quotation): Sent to multiple `vendors`.
3. `quotations`: Bids submitted by vendors for an RFQ.
4. `comparative_statements` (CS): Analysis of quotations. New columns: `totalAmount`, `evaluationType`.
5. `vendor_evaluations`: 7-criteria weighted scoring per vendor per CS. Criteria: Price, Quality, Delivery Timeline, Vendor Experience, Warranty & Support, Financial Stability, Compliance Requirement.
6. `purchase_orders` (PO): For goods and services. New columns: `paymentTerms`, `warrantyTerms`, `deliverySchedule`, `createdBy`.
7. `grn` (Goods Receive Note): Tracking physical delivery. Links to `grn_items`.
8. `qc_inspections`: Quality control pass/fail tracking for GRN items.
9. `invoices` & `payments`: Financial tracking (Invoices auto-generated from QC-completed GRN, then manually marked as Paid).

### BPMN Workflows
- `bpmn_definitions`: Stores the raw XML of active workflows. Workflows are universally scoped per company by `documentType`.
  - **"Item Requisition"**: Department Head approval (1-step).
  - **"Purchase Requisition"**: Head of Operations → CFO (2-step, designation-based).
  - **"CS Evaluation"**: Exclusive gateway with amount-based routing (≤5000→Head of Ops, 5001-100000→CEO, >100000→EC Committee).
  - **"Stock Out"**: Configurable via BPMN designer.
- `pr_approvals` / `document_approvals`: The runtime instances of pending/completed approval steps for a given document.
- All approvals flow through `inbox_tasks` and are actioned via the Global Tasks Inbox.

### Auditing
- `audit_logs`: Tracks critical actions across the system.
- `notifications`: In-app notification alerts for users.

---

## 🔗 Module/Plugin Relational Points

The ERP system has several plugins/modules (Procurement, Inventory, Finance, SaaS/Admin, User Panel) that integrate through specific database relationships. Below is the relational mapping of these integration points:

```mermaid
flowchart TD
    subgraph SaaS_Admin ["SaaS / Admin Module"]
        C[(companies)] --> CP[(company_plugins)]
        C --> U[(users)]
        U --> D[(departments)]
    end

    subgraph UserPanel ["User Panel Module"]
        UPS[(user_panel_settings)] --> UP_TASK["Global Task Templates"]
        IT[(inbox_tasks)] --> UP_INBOX["User Inbox / Global Tasks"]
    end

    subgraph Procurement ["Procurement Module"]
        PR[(purchase_requisitions)] --> PRI[(pr_items)]
        PRI -->|Optional Item Link| INV_I
        PR --> RFQ[(rfq)]
        RFQ --> Q[(quotations)]
        Q --> CS[(comparative_statements)]
        CS --> PO[(purchase_orders)]
        PO --> POI[(po_items)]
    end

    subgraph Inventory ["Inventory Module"]
        INV_I[(inventory_items)] --> ST[(stock_transactions)]
          INV_I --> SOR[(stock_out_requests)]
          ### 4. `stock_out_requests` & `stock_transfers`
          - `stock_out_requests`: Tracks requests for deducting items from stock.
            - `warehouseId`: (UUID) The source warehouse from which stock is requested.
          - `stock_transfers`: Tracks movement of items between two warehouses.
            - Relies on `stock_transfer_items` for specific quantities.
            - Requires `sourceWarehouseId` and `destinationWarehouseId`.
            - Follows a BPMN workflow (`documentType: 'Stock Transfer'`) parsed dynamically using `evaluateWorkflowPath`.
            - Once approved, items move to `Transit` state and deduct from the source warehouse.
            - Destination warehouse manager uses the **Transfer Receive** action to mark it `Received` and inject into `warehouse_stock`.
          - Both integrated with `document_approvals` via dynamic BPMN engine.
          - Upon final approval step in `document_approvals` (sequential multi-step paths), actual stock is deducted from `warehouse_stock` and `global_stock_ledger`.
          INV_I --> WS[(warehouse_stock)]
        GRN[(grn)] --> GRNI[(grn_items)]
        GRNI --> QC[(qc_inspections)]
    end

    subgraph Finance ["Finance/Accounts Module"]
        INV[(invoices)] --> PMT[(payments)]
    end

    %% Relational Integration Points
    POI -->|References| GRNI
    PO -->|References| GRN
    PO -->|3-Way Match| INV
    GRN -->|3-Way Match| INV
    RFQ -->|Invites| V[(vendors)]
    CS -->|Selects| V
    PO -->|Vendor Contract| V
    U -->|assignedToUid| IT
    C -->|companyId| UPS
```

### 🗝️ Key Integration Points
1. **Procurement ↔️ Inventory (Item Catalog Link)**:
   - `pr_items.itemId` optionally references `inventory_items.id`. When a PR is created for a known inventory catalog item, this foreign key connects the request to the stock item.
2. **Procurement ↔️ Inventory (Goods Receipt)**:
   - `grn` references `purchase_orders.id` via `poId`.
   - `grn_items` references `po_items.id` via `poItemId` to track how many quantities of an ordered item have been received.
3. **Inventory ↔️ Quality Control**:
   - `qc_inspections` references `grn_items.id` via `grnItemId`. This ensures that items received via GRN are audited for quality before being fully stocked/accepted.
4. **Inventory ↔️ Warehouses (Stock Tracking)**:
   - The `warehouse_stock` table explicitly tracks the `quantity` of `inventory_items` stored at a specific `warehouse_id`. All `stock_transactions` log the `warehouseId` (and optionally `vendorId`) to ensure accurate location-based stock auditing.
5. **Procurement -> Inventory -> Finance (GRN-wise Invoicing)**:
   - `invoices` references `purchase_orders.id` and `grn.id`.
   - **GRN-wise Logic**: Invoices are generated specifically from 'QC Completed' GRNs. The invoice amount is auto-calculated based on GRN items (`passedQty`) and PO unit prices. Pending invoices are manually marked as Paid, instantly generating a corresponding `payments` record.
6. **Dynamic Workflows ↔️ All Documents**:
   - ### Document Approvals (`document_approvals`)
   Generalized approval tracking for all documents (e.g., `'PO'`, `'CS'`, `'Invoice'`, `'Stock Out'`).
   - `documentType`: Specifies the parent document type.
   - Replaces legacy tables like `pr_approvals` for new modules.
7. **User Panel ↔️ All Modules**:
   - Any module can insert into `inbox_tasks` to notify/assign a user. The `inbox_tasks.referenceType` and `referenceId` fields link back to the originating document.

---

## 📂 Project Structure

```text
/src
  /assets         # Static images, styles (index.css)
  /modules        # Domain-driven modules
    /admin        # SaaS Admin, System Settings, Organogram, Workflow Designer
    /auth         # Login page
    /home         # Home (module selector), Inbox (Global Tasks)
    /procurement  # PR, PO, RFQ, CS, Vendors, Invoices views and logic
    /inventory    # Stock, GRN, QC views and logic
    /userPanel    # User Panel module
      /api        # routes.ts – Express routes for /api/user-panel/*
      /pages      # Tasks.tsx (global tasks view – formerly My Tasks)
  /shared
    /components   # Layout.tsx (sidebar + header), AuthProvider, PageLayout, etc.
    /contexts     # LayoutContext (search, pagination, global loading)
    /db           # schema.ts, drizzle setup (index.ts)
    /lib          # api.ts (fetchWithAuth), utils.ts (cn helper)
    /middleware   # auth.ts (requireAuth, AuthRequest), checkPlugin.ts
/server.ts        # Main Express backend – all API routes + plugin auto-seed
```

---

## 🛠️ Key Developer Workflows

> [!TIP]
> **API Development**
> All backend routes are either in `server.ts` or in module-level `routes.ts` files (e.g., `src/modules/userPanel/api/routes.ts`). Always wrap endpoints in `requireAuth` and start with `let companyId = await resolveTenantId(req);` to ensure multi-tenant safety.

> [!TIP]
> **Adding a New Module/Plugin**
> 1. Create a `src/modules/<name>/` folder with `pages/` and `api/routes.ts`.
> 2. Register the plugin slug in the `plugins` table (or add to the auto-seed block in `server.ts`).
> 3. Register the Express router in `server.ts`: `app.use('/api/<name>', <nameRouter>)`.
> 4. Add React routes in `src/App.tsx` wrapped in `<PluginProtectedRoute pluginSlug="<name>">`.
> 5. Add sidebar menu entries in `src/shared/components/Layout.tsx` under the appropriate `*Menus` array.
> 6. Add a card to `src/modules/home/pages/Home.tsx` for the module selector.

> [!WARNING]
> **Database Migrations**
> If you modify `schema.ts`, you MUST run Drizzle migrations to update the PostgreSQL database. Do not manually alter the Supabase tables in production without running the Drizzle push command.

> [!NOTE]
> **User Synchronization**
> Users are created via Supabase Auth first. When a user logs in, the `POST /api/auth/sync` endpoint is called to ensure their profile exists in the `users` table and is linked to their `companyId`.

> [!NOTE]
> **Sidebar Active Module Detection**
> The sidebar module is determined in `Layout.tsx` by checking `location.pathname` with `startsWith()`. The order of checks is important:
> - `/inbox` → `user-panel` (must come before any `/admin` check)
> - `/admin` → `admin`
> - `/my-tasks` or `/profile` → `user-panel`
> - `/procurement-dashboard`, `/pr`, `/purchase`, `/vendors`, `/rfq`, `/cs`, `/invoices` → `procurement`
> - `/inventory-dashboard`, `/inventory`, `/grn`, `/qc`, `/stock` → `inventory`

## 👤 User Profile Module

### Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile` | Get the authenticated user's profile from `users` table |
| PUT | `/api/profile` | Update `name`, `phone`, `designation`, `department` |
| PUT | `/api/profile/avatar` | Update `avatar_url` with a base64 image string |
| PUT | `/api/profile/password` | Change password via Supabase Admin API |

### Frontend Page
- **Route**: `/profile`
- **File**: `src/modules/userPanel/pages/Profile.tsx`
- **Features**:
  - View avatar with initials fallback
  - Upload profile picture (base64, max 2MB)
  - Edit name, phone, designation, department
  - Change password with strength indicator (old + new + confirm)
  - Real-time success/error alerts

### DB Column Note
> [!IMPORTANT]
> The `avatar_url` column was manually added to the `users` table via `scripts/add_avatar_url.cjs` (one-off migration).
> The schema definition exists in `src/shared/db/schema.ts` line 41.
> If deploying to a fresh DB, run: `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;`

### Sidebar
- The **User Panel** sidebar now contains: **Global Tasks** + **My Profile**
- The sidebar user card (bottom of sidebar) is clickable and links to `/profile`
- The avatar in the sidebar card updates live after profile picture upload


### 13. Deployment & Structural Changes
- **Agent Rule (Vercel)**: Do NOT deploy to Vercel (e.g. `npx vercel --prod`) without explicit permission from the user. You must wait for the user to explicitly tell you to deploy.
- **Agent Rule (Structural Changes)**: Before making any database schema changes, API route modifications, or major architectural/structural changes, you **MUST** ask for the user's permission first. Always present your plan and get the green light before proceeding with backend or DB modifications.

### 14. Production Security & Stability
- **Rate Limiting (`express-rate-limit`)**: The Express server implements a global rate limiter to prevent API abuse (Brute-force / DoS). It restricts clients to 300 requests per minute per IP. 
- **Request Timeout**: A global middleware forces a `408 Request Timeout` if a request hangs for more than 30 seconds (e.g. caught in an infinite loop or heavy database locking).
- **Deployment Note**: When deploying these stability measures to the live production server (Vercel), ensure `express-rate-limit` is added to the production dependencies. Note that in a true serverless environment, the rate limiter memory is isolated per function instance, but it still mitigates localized abuse.

## 📦 Inventory Permissions

- **Granular Warehouse Access**: Users can be mapped to specific warehouses using the warehouse_managers table. 
- **Item Type Filtering**: Mappings support specific item types (Admin, IT, or Both). Normal users can only perform Stock-In and Stock-Out operations for the warehouses and item types they are explicitly assigned to manage.
- **Super Admin Exception**: Users with the Super Admin or Admin roles bypass these restrictions and have global access.
- **Admin APIs**: Admin endpoints exist at POST/GET/DELETE /api/admin/warehouse-managers to configure these mappings, integrated into the Admin UI (WarehouseManagerTab).
## Dynamic Notification Settings
- **Configuration**: Notifications in the system (like PR Approvals, Stock Transfers, Invoices) are dynamically generated based on templates.
- **Table**: 
otification_settings stores the 	itleTemplate,  odyTemplate, and isActive flag for each  ctionEvent mapped per companyId.
- **UI Management**: Super Admins can configure these notifications via the Admin Panel -> System Setting -> Notification Settings.
- **Usage**: Backend functions like 
otifyUser, 
otifyUsersByRole, and 
otifyApprovers use getNotificationConfig to resolve templates and replace variables (like {{reference}}) before creating 
otifications.

## Admin Dashboard
- Added a dynamic **Admin Dashboard** in the Administration module (`AdminDashboard.tsx`).
- It fetches real-time tenant-specific counts (Users, Roles, Departments, Units, Designations, Branches, Warehouses) via the `GET /api/admin/dashboard` endpoint.
- Provides a centralized overview and quick-navigation cards to various administration settings.

## Authentication & Database Stability
- **Stateless Backend Auth**: The @supabase/supabase-js clients in the Node.js/Express backend (server.ts,  uth.ts) must be configured as stateless ( uth: { persistSession: false, autoRefreshToken: false }). This prevents AuthSessionMissingError race conditions caused by concurrent verification of user tokens across serverless instances.
- **Database Connection Pooling**: To prevent connection exhaustion (EMAXCONNSESSION) against the 15-connection Supabase Free Tier limit, the PostgreSQL pool max size in src/shared/db/index.ts is strictly set to 1. This is necessary for both Vercel Serverless environment and local Windows development (where 	sx watch hot-reloads fail to trigger graceful shutdown hooks, leading to rapid connection leaks).
- **Dead Session Recovery**: If the backend rejects a JWT with 401 Unauthorized (e.g., if the session was revoked or deleted remotely), the frontend AuthProvider explicitly catches the 401 and calls  wait supabase.auth.signOut(). This guarantees the dead session is erased from localStorage, preventing an infinite retry loop that floods the backend.

## 🔀 Branch-Based Requisition Routing
- **Automatic Matching**: Approved purchase/item requisitions (`purchase_requisitions` table) are automatically routed to the correct Warehouse Managers based on branch assignment.
- **Fulfillment List Filtering**: In `GET /api/pr/approvals`, if the requester belongs to Branch A, only Warehouse Managers assigned to warehouses in Branch A (via `warehouse_managers` and `warehouses` tables) will see this requisition under their approvals list for fulfillment.
- **Super Admin Exception**: Super Admins bypass this filter and can see and fulfill all approved requisitions globally.

## 📊 Reporting & Dashboard Enhancements
- **Requisition Report**: Added a robust reporting module (`/requisition-report`) that allows filtering by `startDate`, `endDate`, `status`, `deliveryStatus`, `department`, `branchId`, `userId`, and `itemId`. It supports exporting the filtered data to Excel (XLSX) and PDF formats.
- **Delivery Tracking**: The Requisition Report and Dashboard Requisition Summary now actively track requisition fulfillment statuses: `Fully Delivered`, `Partially Delivered`, and `Not Delivered`.
- **Smart Dashboard Routing**: Instead of sending users to generic list views, clicking on Inventory Summary metric cards (like "Total Stock Qty") or Requisition Summary cards (like "Pending" or "Fully Delivered") automatically redirects them to the relevant Report (`/inventory-report` or `/requisition-report`) with the appropriate query parameters pre-applied.
- **User Panel Dashboard**: Added a new `/user-dashboard` page powered by `GET /api/user-panel/dashboard`. It serves as the new post-login landing page, aggregating the user's specific requisition data (status and delivery metrics) and their assigned inbox tasks into clear summary cards. Integrated fully with RBAC.

## 🔐 Microsoft SSO & Dynamic Onboarding Flow
- **Tenant & Domain Checking**: SSO authentication uses Microsoft MSAL to verify the user's token. The backend (`/api/auth/sso/microsoft`) extracts the email from the Graph API and checks it against `companies.ssoEmailDomain` to ensure they belong to a company with `isSsoEnabled = true`.
- **Dynamic BPMN Routing**: User Registration is no longer a hardcoded HR task. The system fetches the BPMN definition for `documentType: 'User Registration'`. Using `evaluateWorkflowPath`, it generates sequential approval steps saved in the `document_approvals` table.
- **Multi-Step Inbox Processing**: The first step triggers an `inbox_tasks` entry. The user remains `Pending HR Approval` (or `Pending Approval`) while the task moves through the chain.
- **Final Step Validation**: In the Global Inbox UI (`Inbox.tsx`), intermediate approvers can optionally suggest organizational mapping. However, for the **final approver** (`isFinalStep`), assigning the user's `Department`, `Designation`, `Role`, and `Branch` is strictly **mandatory**.
- **Activation & Notification**: Upon final approval (`/api/auth/sso/approve-user`), the user's status is updated to `Active`, the assigned fields are persisted to the `users` table, and the backend dynamically dispatches a welcome email via SMTP using `nodemailer`.


### Profile Data Change Requests
- **Dynamic BPMN Workflow**: Profile updates (such as changing a phone number, department, designation, office, supervisor, or role) are not direct `UPDATE` queries. They are submitted as drafts to the `profile_change_requests` table and routed via the dynamic BPMN engine under `documentType: 'Profile Data Change Request'`.
- **Inbox Final Step Override**: When the request reaches the final approver (e.g., HR) in the Global Inbox, the `Inbox.tsx` UI exposes the requested fields in an editable form. The final approver can override any requested data (such as assigning a different role or supervisor) before clicking "Approve Updates".
- **Automatic Fulfillment**: Upon final approval, the backend automatically merges the approved data into the `users` table, updates role assignments, sends an email notification to the user, and marks all related inbox tasks as completed.

## 🧪 Automated Testing Strategy
- **Framework**: The project uses `vitest` and `supertest` for backend unit and integration testing.
- **Tenant Isolation**: Tests must simulate tenant behavior by targeting specific test companies (e.g., `ABC Company`). They should bypass global pollution by explicitly retrieving and injecting the `companyId`.
- **Execution**: Run backend tests via `npx vitest run`. Test files are placed in the `tests/` directory (e.g., `tests/procurement.test.ts`, `tests/system.test.ts`).
- **Integration flows**: API & Database flows (like PR insertion, Items insertion, User assignments) are validated synchronously through Drizzle ORM to ensure constraint safety.

## 🔔 Notification Settings UI
- **Module-Wise Accordions**: In the Admin Notification Settings, templates are grouped by system modules (e.g., PR Approvals, User Registrations) in collapsible accordions.
- **Searchable**: Admins can globally search notification templates.
- **Dynamic Variable Injection**: Professional email templates are used with dynamic parameters mapping database values via bracket templates (e.g. `[approver_name]`, `[document_type]`).

## 🚀 Production Server Requirements
When hosting the SLI ERP System on a dedicated production server (e.g., VPS like DigitalOcean, AWS EC2, or Azure VM), the following software stack must be installed and configured:

1. **Node.js & Package Manager**
   - **Node.js**: Version 18.x or 20.x (LTS) is required to run the Express backend and build the React frontend.
   - **npm / yarn**: For installing dependencies.
2. **Process Manager**
   - **PM2**: `npm install -g pm2`. Used to run the Node.js backend (`server.ts` compiled to `server.js`) in the background, ensuring it restarts automatically if it crashes or the server reboots.
3. **Web Server & Reverse Proxy**
   - **Nginx** (Recommended) or **Apache**: Required to serve the compiled Vite/React static files (`dist/` folder) and to act as a reverse proxy forwarding `/api` requests to the PM2-managed Node.js instance (running on port 3000).
4. **Security & SSL**
   - **Certbot (Let's Encrypt)**: To provision free SSL/TLS certificates and enable `HTTPS`. Web browsers require HTTPS for secure cookie transmission, especially for SSO.
5. **Database**
   - **Supabase / PostgreSQL**: Currently, the system uses Supabase (managed Postgres). If migrating to self-hosted, a dedicated PostgreSQL 15+ instance is required.
6. **Version Control**
   - **Git**: To securely pull the latest code from the repository directly onto the server.
