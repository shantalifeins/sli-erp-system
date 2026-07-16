# SLI ERP — Database Schema (Drizzle ORM)

Schema lives in `src/shared/db/schema.ts`. If you modify it, you MUST run Drizzle migrations to update Postgres — never hand-edit Supabase tables directly in production.

## Identity & Organization
- `companies` — tenant root table.
- `branches` — locations/sub-units belonging to a company (tenant isolation).
- `warehouses` — storage locations linked to a company + branch.
- `users` — synced with Supabase Auth via `uid`. Stores email, role, designation, department. Includes a mandatory `branchId`. User creation/update MUST always include `branchId`.
- `roles` / `role_permissions` — granular RBAC, compound-unique on (`companyId`, `name`) — no global uniqueness on role names.
- `departments` / `units` — hierarchical organogram; `managerUid` links a user as head of a node.
- `designations` — lookup table for job titles.

## User Panel Module
- `user_panel_settings` — global task templates per company (`taskKey`, `taskName`, `defaultAssigneeUid`, `isActive`).
- `user_panel_permissions` — per-user flags (`canView`, `canEdit`, `canAdmin`).
- `inbox_tasks` — individual tasks. Fields: `assignedToUid`, `assignedToRole` (fallback), `category`, `title`, `message`, `actionLink`, `referenceType`, `referenceId`, `status`, `actionResult` (`Approved` | `Rejected` | `Review`).
- `GET /api/inbox` filters by `assignedToUid` OR `assignedToRole`, and deduplicates by (`referenceType`, `referenceId`) keeping only the most recent, so users don't see duplicate history loops (e.g. "Sent for Review" then "Approved") in the Completed tab. It also merges status fields from referenced entities (e.g. `prStatus` from `purchase_requisitions`) so the frontend can render decision badges in real time.

## Procurement Lifecycle (P2P)
- `purchase_requisitions` (PR) — internal item requests. Links to `pr_items`.
- `rfq` — Request for Quotation, sent to multiple `vendors`.
- `quotations` — vendor bids for an RFQ.
- `comparative_statements` (CS) — analysis of quotations to select a winning vendor.
- `purchase_orders` (PO) — the official order to the vendor. Links to `po_items`.
- `grn` (Goods Receive Note) — physical delivery tracking. Links to `grn_items`.
- `qc_inspections` — pass/fail QC on GRN items.
- `invoices` & `payments` — financial tracking / 3-way match (PO ↔ GRN ↔ Invoice).

## Form Submission Notes
- **PR submission**: React Hook Form, items as an array inserted into `pr_items`. Triggers `evaluateWorkflowPath` (BPMN engine) to create `pr_approvals` steps + one `inbox_tasks` entry for the first step.
- **Stock Out**: scoped by `warehouseId`, filtered against `warehouse_stock` availability. Triggers BPMN engine to create `document_approvals` (`documentType: 'Stock Out'`) + one `inbox_tasks` entry for the first step.
- **GRN**: submits arrays of received items, writes directly to `global_stock_ledger`.
- Always wrap form submit handlers with an `isSubmitting` guard to prevent duplicate POSTs.

## Workflows & Auditing
- `bpmn_definitions` — raw XML of active workflows, scoped per company by `documentType` only (e.g. `'Item Requisition'`, `'Stock Out'`) — not split by department. Query/save purely on `documentType` + `companyId`.
- `pr_approvals` / `document_approvals` — runtime instances of pending/completed approval steps. `document_approvals` is the generalized successor and replaces `pr_approvals` for new modules/document types (`'PO'`, `'CS'`, `'Invoice'`, `'Stock Out'`, etc).
- `audit_logs` — tracks critical actions.
- `notifications` — in-app alerts.

## Inventory Domain
- `inventory_items` — must include `isAdminItem` (bool), `isItItem` (bool), optional `basePrice`/`asePrice` tracked per UOM.
- `warehouse_stock` — quantity of an `inventory_item` at a specific `warehouseId`.
- `stock_transactions` — logs `warehouseId` (and optionally `vendorId`) for location-based auditing.
- `stock_out_requests` — requests to deduct stock; `warehouseId` = source warehouse; integrated with `document_approvals`. On final approval, stock is deducted from both `warehouse_stock` and `global_stock_ledger`.
- `warehouse_managers` — maps users to the warehouses (and item types: Admin/IT/Both) they're allowed to Stock In/Out for. `GET /api/warehouses` must respect this mapping for non-admins.

## Key Relational/Integration Points
- `pr_items.itemId` optionally references `inventory_items.id`.
- `grn.poId` → `purchase_orders.id`; `grn_items.poItemId` → `po_items.id`.
- `qc_inspections.grnItemId` → `grn_items.id`.
- `stock_transactions` always logs `warehouseId` for accurate location auditing.
- **3-Way Match**: `invoices` references `purchase_orders.id` and `grn.id`; verifies PO (qty/price) == GRN (qty received) == Invoice (amount billed).
- `document_approvals.documentType` links any document type to the dynamic BPMN engine.
- Any module can insert into `inbox_tasks` (`referenceType` + `referenceId` link back to the originating document) to notify/assign a user.

## PR Fulfillment / Partial Delivery
- `pr_created_quantity` on `pr_items` tracks which pending items were already ported into a new PR from a partially-fulfilled one.
- Always recompute pending quantity as: `quantity - deliveredQuantity - prCreatedQuantity` to avoid duplicate PR cycles.
- Once all items are delivered or ported, the original PR is marked `'Fully Delivered'` and drops out of pending lists.

## Known One-off / Manual Migrations
- `users.avatar_url` was added manually via `scripts/add_avatar_url.cjs`. If deploying to a fresh DB, also run: `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;`
- `estimatedCost` / `estimatedPrice` are removed from the frontend UI (PR create/approve, inbox) but the backend schema still has `estimatedCost numeric().notNull()` — the frontend silently sends `0` for these fields. Don't reintroduce UI for them without checking if this constraint should also be relaxed.
