# 🤖 Workspace Rules & Agent Guidelines

This document defines the strict architecture, security standards, UI conventions, and workflow rules for the **SLI ERP System**. The AI agent MUST follow these guidelines without exception.

---

## 🏗️ 1. Core Architectural & Multi-Tenant Rules
- **Stack**: React 18, TypeScript, Vite, Tailwind CSS, Node.js, Express, Drizzle ORM, Supabase PostgreSQL.
- **Strict Multi-Tenancy**: Almost all tables contain `companyId` (UUID). Express routes MUST call `let companyId = await resolveTenantId(req);` and restrict operations strictly to that tenant. Never use cross-tenant fallbacks.
- **RBAC Integration**: Features and endpoints must enforce explicit permissions (`isSuperAdmin || getPermission('Feature Name')?.canView`). Always register new permissions in the `hierarchy` array in `Admin.tsx`.
- **Drizzle UID Cascades**: Foreign keys pointing to `users.uid` MUST specify `{ onUpdate: 'cascade' }` to prevent PostgreSQL crashes if Supabase Auth UIDs mutate.
- **User Synchronization**: Users must exist in BOTH PostgreSQL `users` and Supabase Auth (`GoTrue`). Importing users via SQL requires dual-creation via `supabaseAdmin.auth.admin.createUser`.
- **Security & Footprint**: Always configure `helmet` to strip `X-Powered-By` headers, restrict CORS to `FRONTEND_URL` in production, and apply `express-rate-limit`.

---

## 🎨 2. UI & Frontend Conventions
- **Searchable Dropdowns**: For large datasets (Users, Departments, Designations, Branches), use custom searchable dropdowns rather than native `<select>` elements.
- **Mandatory Red Asterisks**: Do NOT manually append `<span className="text-red-500">*</span>` to labels. Apply the HTML5 `required` attribute to the `<input>` or `<select>`, and `index.css` (`label:has(+ *:required)::after`) will render the red asterisk automatically.
- **Local Navigation**: Every "Add", "Edit", or "View" page MUST include a local header back button (`<ArrowLeft />`) routing back to the list view (e.g. `setShowForm(false)`). There is no global layout back button.
- **Item Badges**: Render small visual badges for Admin (<span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold">ADMIN</span>) and IT items (purple) next to item names in all lists and approval views.
- **Dynamic Currency**: Never hardcode `$`, `৳`, or currency symbols. Use the `useCurrency()` hook from `SettingsProvider` to prefix amounts (`{currencySymbol}{amount}`).
- **Sidebar Matching**: New sub-routes MUST be covered by `path.startsWith()` in `Layout.tsx`'s `activeModule` determination logic to prevent sidebar menus from disappearing.
- **Form Double Submit Prevention**: Wrap all POST/PUT form handlers in `isSubmitting` guards to disable submit buttons and prevent duplicate network calls.
- **React Hook Form reactivity**: When attaching custom `onChange` handlers to registered inputs, ALWAYS invoke `register(field).onChange(e)` inside the custom handler.

---

## 🔄 3. Workflow & Global Inbox Rules
- **Actionable Approvals**: Approvals, rejections, and review loops occur directly in the **User Panel → Global Inbox** (`/inbox`). Status list pages (e.g. `/requisition-list`) remain read-only for public auditing.
- **Inbox Task Completion**: When processing an approval step, mark ALL pending `inbox_tasks` for that document as `'Completed'` by querying purely on `referenceType` and `referenceId` (without restricting by `assignedToUid`).
- **Approver Fallback**: When resolving approvers dynamically in `notifyApprovers`, if no user matches the department/role, create a fallback `inbox_tasks` entry with `assignedToRole` (and `assignedToUid: null`) so Super Admins can action it.
- **Role vs. Designation Inbox Querying**: Queries fetching inbox tasks MUST check EITHER the user's role OR designation: `or(eq(inbox_tasks.assignedToRole, userRole), eq(inbox_tasks.assignedToRole, userDesignation))`.
- **Dynamic BPMN Identification**: Workflows (`bpmn_definitions`) are identified purely by `documentType` and `companyId` (not split by department).
- **Onboarding & Profile Changes**: User Registration (`User Registration`) and Profile Updates (`Profile Data Change Request`) run through dynamic BPMN workflows. Assigning Role/Branch/Dept/Designation is optional for intermediate approvers but mandatory for the final approver (`isFinalStep`).

---

## 📦 4. Procurement & Inventory Domain Rules
- **Procurement Lifecycle (P2P)**: IR → PR (`sourceIrId`) → PR Approval (Head of Ops → CFO) → RFQ → CS Evaluation (Exclusive amount gateways: ≤5k BDT Ops; 5k–100k BDT Ops → CEO; >100k BDT Ops → CEO → EC) → PO → GRN → Invoice.
- **Descriptive & Filtered Dropdowns**: All entity select dropdowns (GRN, PO, CS, RFQ, PR) MUST display rich context (`Number — Vendor (PO/PR) - Item Summary`) AND apply **Lifecycle Exclusion Filtering** (`!hasRfq`, `!hasCs`, `!hasPo`, `!hasGrn`, `!hasInvoice`) to hide already actioned documents.
- **QC Inspection & Stock Additions**:
  - Passed items are locked into stock immediately.
  - Partial QC renders separate badges (`✓ Passed (In Stock)` and `⚠️ Hold`).
  - **Re-inspect Hold** modal is strictly scoped to remaining held items only.
  - Stock updates (`quantityInStock`, `warehouse_stock`, `global_stock_ledger`) calculate incremental additions: `newlyPassed = passedQty - previousPassedTotal`.
- **PR Deduplication**: Recalculate pending items as `quantity - deliveredQuantity - prCreatedQuantity` when creating new PRs from partially fulfilled requisitions.
- **Warehouse Manager Scoping**: Non-admin warehouse managers are mapped in `warehouse_managers` and can only manage assigned warehouses and item types (Admin, IT, Both).

---

## 📋 5. Definition of Done & Agent Mandates
1. **Multi-tenant Safety**: Verified `resolveTenantId(req)` with no cross-tenant fallback.
2. **RBAC & Hierarchy**: Added new actions/menus to `hierarchy` in `Admin.tsx`.
3. **Database Schema & Migrations**: Any `schema.ts` change MUST be pushed via `npx drizzle-kit push`.
   - *TTY Exception*: If `drizzle-kit push` fails due to non-interactive CLI prompts, execute raw SQL `ALTER TABLE` queries via a temporary Node.js `pg` script, then delete the script.
4. **Docs Auto-Update (Mandatory)**: Always update `DEVELOPER_GUIDE.md` whenever adding modules, changing routing, altering schema, or shipping UI features. Update `AGENTS.md` if core architecture changes.
5. **Testing Strategy**: Implementation plans MUST incorporate Unit Testing, API Testing, and Regression Testing phases.
6. **Explicit User Approval**:
   - **Deployment**: Do NOT deploy to Vercel (`npx vercel --prod`) without explicit user permission.
   - **Structural Changes**: Do NOT alter DB schema or core API routes without user confirmation.

---

## 🔒 6. Multi-Project & Workspace Git Isolation Rules
- **Strict Directory Boundaries**: Always operate strictly within the root directory of the active workspace (`d:\Procurement And inventory`).
- **Git Remote Verification**: Before executing any `git push` or `git remote` command, ALWAYS verify `git remote -v` to ensure it points strictly to the assigned repository for THIS project (`https://github.com/shantalifeins/sli-erp-system.git`).
- **Zero Cross-Contamination**: Never copy, commit, or push files or secrets between different project repositories. Each project must maintain its own dedicated Git history, `.env` configurations, and deployment pipelines.