# 📘 SLI ERP System — Business Requirements Document (BRD)

**Organization**: Shanta Life Insurance PLC & Subsidiary Companies  
**Document Title**: Business Requirements Document (BRD)  
**Live Application URL**: `https://erp.shantalife.com`  
**Architecture**: Multi-Tenant React 18 + Node.js Express + PostgreSQL (`sli_erp_db`) with Drizzle ORM  
**Version**: v2.4 (Production Live Specification)  

---

## 1. Executive Summary & System Vision

The **Shanta Life Insurance (SLI) ERP System** is an enterprise-grade resource planning platform engineered to digitize, automate, and centralize end-to-end Procurement (Procure-to-Pay P2P), Inventory Control, Quality Control (QC), Multi-Tenant Administration, and Dynamic Approval Workflows.

The system replaces manual paper-based requisitions, unmonitored vendor biddings, and untracked warehouse ledgers with strict role-based access control (RBAC), multi-level BPMN workflow approvals, exclusive monetary threshold gateways, and multi-tenant data isolation.

---

## 2. System Architecture & Technology Stack

| Component Layer | Technology / Specification |
| :--- | :--- |
| **Frontend Framework** | React 18, TypeScript, Vite, Vanilla CSS / Tailwind CSS, Lucide Icons |
| **Backend Services** | Node.js, Express.js (REST APIs, Static SPA Wildcard Fallback serving `dist/index.html`) |
| **Database & ORM** | Supabase PostgreSQL / Native PostgreSQL (`sli_erp_db`) with Drizzle ORM |
| **Multi-Tenancy Scoping** | Strict `companyId` UUID scoping per HTTP request via `resolveTenantId(req)` |
| **Authentication Engine** | Dual Mode (`AUTH_MODE=postgres` / `AUTH_MODE=supabase`) with PBKDF2 Hashing & JWT Signing |
| **Production Infrastructure** | Ubuntu Live Server (`10.16.49.78` / `erp.shantalife.com`) with Let's Encrypt SSL & Docker |

---

## 3. Core Functional Modules & Business Rules

### 3.1 Module 1: User Authentication, Profile & Multi-Tenancy
- **Native PostgreSQL Login**: Authenticates users using PBKDF2 with 1000 iterations and SHA-512 hashing.
- **User Registration & Profile Updates**: Requests for new user registration or profile data changes run through dynamic BPMN workflows.
- **Multi-Tenant Context Switching**: Users belong to a specific company (`companyId` UUID). Global Super Admins (`companyId = null`) have cross-tenant visibility and can switch active company contexts via the header Company Dropdown.

### 3.2 Module 2: Role-Based Access Control (RBAC) & Hierarchy
- **System Roles**: Super Admin, Admin, Procurement Manager, Warehouse Manager, SLI Employee, Requester.
- **Granular Permissions**: Configured in `role_permissions` across 5 action flags (`canView`, `canCreate`, `canEdit`, `canDelete`, `canApprove`).
- **Visual Item Badges**: Displays visual badges in lists and approvals for Admin (Blue badge) and IT items (Purple badge).

### 3.3 Module 3: Global Inbox & Dynamic BPMN Approval Workflows
- **Centralized User Inbox**: All approvals, document reviews, and workflow tasks occur in **User Panel → Global Inbox** (`/inbox`).
- **Task Completion Rule**: Actioning an approval step marks ALL pending `inbox_tasks` for that document as `'Completed'` by querying `referenceType` and `referenceId`.
- **Approver Fallback Rule**: If no user matches a required approval role/department, the system generates a fallback `inbox_tasks` entry with `assignedToRole: 'Super Admin'` so Super Admins can action it.

### 3.4 Module 4: Procure-to-Pay (P2P) Procurement Lifecycle

The P2P lifecycle consists of 6 sequential stages:
1. **Item Requisition (IR) → Purchase Requisition (PR)**: Employee creates PR from approved IR. Available item quantities are deduplicated as: `Available = (Quantity - DeliveredQty - PRCreatedQty)`.
2. **Request for Quotation (RFQ)**: Approved PRs are issued to vendors. Dropdowns display rich context (`PR Number — Vendor — Item Summary`) and apply **Lifecycle Exclusion Filtering** (`!hasRfq`).
3. **Comparative Statement (CS) Evaluation**: Vendor bids are evaluated across exclusive monetary threshold gateways:

| Monetary Threshold (BDT) | Approval Workflow Gateway | Final Approver Authority |
| :--- | :--- | :--- |
| **≤ 5,000 BDT** (Minor Purchase) | Head of Operations | Head of Operations |
| **5,001 – 100,000 BDT** (Standard) | Head of Operations → Chief Executive Officer (CEO) | CEO |
| **> 100,000 BDT** (Capital / Major) | Head of Operations → CEO → Executive Committee (EC) | Executive Committee (EC) |

4. **Purchase Order (PO)**: Issued upon CS approval. Tracks vendor commitments and delivery dates.
5. **Goods Receipt Note (GRN)**: Generated upon physical delivery at warehouse.
6. **Invoicing & Payment**: Invoices matched against GRN/PO for CFO payment release.

### 3.5 Module 5: Inventory Control, Quality Control (QC) & Warehouses
- **Immediate Stock Locking**: Passed items from QC Inspections are locked into warehouse stock immediately.
- **QC Status Badges & Re-Inspection**: Visual status badges display `✓ Passed (In Stock)` (Green) and `⚠️ Hold` (Yellow). The Re-inspect Hold modal is strictly scoped to remaining held items only.
- **Incremental Stock Addition**: Stock calculations compute incremental additions: `newlyPassed = passedQty - previousPassedTotal`.
- **Warehouse Manager Control**: Non-admin warehouse managers (mapped in `warehouse_managers`) can only manage assigned warehouses and item types (Admin, IT, Both).

### 3.6 Module 6: Administration & System Branding Settings
- **Master Data Management**: Central control of Companies, Branches, Departments, Designations, Roles, and Plugins.
- **System Settings & Base64 Branding**: Primary WebP Logo, White WebP Logo, and Favicon PNG are stored in `system_settings` as Base64 data URIs for instant cross-device rendering.
- **Dynamic Currency**: Amounts are prefixed dynamically using the `useCurrency()` hook from `SettingsProvider` (`{currencySymbol}{amount}`).

---

## 4. Key Database Entities & Data Schema

| Table Name | Primary Key & Multi-Tenant Field | Business Description |
| :--- | :--- | :--- |
| `users` | `id` (Serial), `uid` (UUID), `company_id` | Stores user accounts, authentication credentials, role, department, designation, and branch. |
| `companies` | `id` (UUID) | Master tenant directory (Shanta Life Insurance PLC, Shanta Asset Management Limited, etc.). |
| `purchase_requisitions` | `id` (Serial), `company_id` | Stores PR headers, requisition status, total amount, requester UID, and approval state. |
| `rfq` | `id` (Serial), `company_id` | Request for Quotation records issued to vendors for bidding. |
| `comparative_statements` | `id` (Serial), `company_id` | CS evaluations comparing vendor quotation prices and amount gateways. |
| `purchase_orders` | `id` (Serial), `company_id` | Binding PO contracts issued to winning vendors. |
| `grn` | `id` (Serial), `company_id` | Goods Receipt Notes tracking physical items delivered at warehouses. |
| `qc_inspections` | `id` (Serial), `company_id` | Quality Control inspection logs detailing passed vs held quantities. |
| `inventory_items` | `id` (Serial), `company_id` | Item master catalog including SKU, unit, category, and stock balance. |
| `system_settings` | `id` (Serial), `company_id` | Stores Base64 logos, favicons, currency symbols, and company contact details. |

---

## 5. Non-Functional & Security Requirements

- **Security Header Compliance**: Express app uses `helmet` middleware stripping `X-Powered-By` headers, enforcing CORS restricted strictly to `FRONTEND_URL` in production.
- **Database Foreign Key Cascade Integrity**: Foreign keys referencing `users.uid` specify `{ onUpdate: 'cascade' }` to prevent database crashes if authentication UIDs mutate.
- **Form Double Submit Prevention**: All POST/PUT form submission handlers incorporate `isSubmitting` state guards to disable submit buttons and block duplicate network calls.
- **Deployment Architecture**: Deployments to live server (`10.16.49.78`) occur via MCP deployment tooling (`scripts/mcp-deploy-server.ts`) executing Docker container rebuilds.
