# 🤖 Workspace Rules & Context Auto-Update

This file guides the AI agent when working on the **SLI ERP System**. It ensures the agent understands the architecture and automatically maintains documentation.

## 📚 Skill Reference (Kilo Commands)

The following detailed reference files live in `.kilo/command/` and are recognized by the Kilo system. Consult them whenever the relevant area is touched:
- [project-overview.md](file:///d:/Procurement%20And%20inventory/.kilo/command/project-overview.md) — stack, multi-tenancy, plugin architecture, project structure, module routing.
- [database-schema.md](file:///d:/Procurement%20And%20inventory/.kilo/command/database-schema.md) — Drizzle schema, tables, relational points, migrations.
- [workflow-engine.md](file:///d:/Procurement%20And%20inventory/.kilo/command/workflow-engine.md) — approvals, inbox rules, revision loops, BPMN identification.
- [rbac-permissions.md](file:///d:/Procurement%20And%20inventory/.kilo/command/rbac-permissions.md) — RBAC, warehouse scoping, item-type tags.
- [frontend-conventions.md](file:///d:/Procurement%20And%20inventory/.kilo/command/frontend-conventions.md) — RHF, search, asterisks, badges, back nav.
- [definition-of-done.md](file:///d:/Procurement%20And%20inventory/.kilo/command/definition-of-done.md) — mandatory completion checklist.

## 🏗️ Core Context Reference
- **Stack**: React 18, TypeScript, Vite, Tailwind CSS, Node.js, Express, Drizzle ORM, Supabase (PostgreSQL).
- **Multi-Tenancy**: Almost all tables have `companyId` (UUID). Express routes use `resolveTenantId(req)` middleware to restrict operations to the tenant. Do not use cross-tenant fallbacks (e.g., defaulting to the first company). RBAC (`roles`, `role_permissions`) is strictly scoped by `companyId` without global uniqueness on names.
- **Workflow Engine**: Custom BPMN engine using `bpmn-js` and dynamic role/designation routing.
- **Developer Guide**: Always refer to [DEVELOPER_GUIDE.md](file:///d:/Procurement%20And%20inventory/DEVELOPER_GUIDE.md) for database structure and flow descriptions.

## 🔄 Automatic Documentation Update Rule
> [!IMPORTANT]
> **Rule for the Agent**: Whenever you complete any task that adds new modules, changes backend routing, alters database schema, or introduces new UI features:
> 1. You **MUST** update [DEVELOPER_GUIDE.md](file:///d:/Procurement%20And%20inventory/DEVELOPER_GUIDE.md) to document the changes.
> 2. If the architecture or routing logic changes, update this `AGENTS.md` file accordingly.

## ⚙️ Custom Layout & UI Development Rules

### 1. Inbox-based Workflow Approvals
- **Actionable Approvals**: Users must approve, reject, or request revisions on documents (e.g., Requisitions) directly from their **Inbox (Global Tasks)** via `inbox_tasks` entries. 
- **Read-Only Status Lists**: Public pages like "Requisition List" (`/requisition-list`) must remain read-only, displaying stage details and workflow history timeline without action buttons.
- **Revision Loops**: When "Send back for Review" is triggered, update the document status to `'Draft'`, set the current `pr_approvals` step status to `'Review'`, and delete ONLY the remaining `'Pending'` `pr_approvals`. Keep completed/reviewed `pr_approvals` to maintain the full review history.
- **Inbox Task Completion Strategy**: When an approval step is processed (Approved, Rejected, Review), ALWAYS mark ALL pending `inbox_tasks` for that document as `'Completed'` and set the `actionResult` column (e.g., 'Approved', 'Rejected', 'Review'). Update by querying purely on `referenceType` and `referenceId`, without restricting by `assignedToUid`. This ensures tasks are cleared globally even if overridden by a Super Admin.
- **Inbox Task Creation Fallback**: When dynamically resolving approvers (e.g., in `notifyApprovers`), if no specific user matches the required department/role combination, you **MUST** still create a fallback `inbox_tasks` entry with `assignedToRole` (and `assignedToUid` as null) so that Super Admins can still see and action the task globally.
- **Inbox Task Deduplication**: The `/api/inbox` endpoint dynamically deduplicates tasks based on `referenceType` and `referenceId` (keeping the most recent) so the frontend UI does not show confusing duplicate history entries for the same document in the 'Completed' tab.
- **Form Double Submit Prevention**: Always wrap API calls in forms (e.g., PR or Stock Out submission) with a robust `isSubmitting` state check to disable submit buttons and prevent duplicate POST requests.
- **BPMN Workflow Identification**: Workflows (`bpmn_definitions`) are identified purely by `documentType` (e.g., 'Item Requisition', 'Stock Out') and `companyId`. They are **no longer** split by `department`. When saving or evaluating workflows, query purely on `documentType`.
- **Local Navigation**: A back button MUST be placed inside the component header for any "Add", "Edit", or "View" pages. This back button must route the user directly back to the module's corresponding list page (e.g. `setView('list')`). There is no global back button in the main layout.

### 3. Role & Plugin Permission Integration
- **Strict Integration Requirement**: Whenever a new action, event, menu, or feature is created, it **MUST** immediately be brought under the purview of the plugin/module system and role-based access control (RBAC). 
- Features should not be left disconnected from `permissions`. Every feature must explicitly check its specific permission state (e.g., `isSuperAdmin || getPermission('Feature Name')?.canView`).
- Make sure to update the `hierarchy` array in `Admin.tsx` to expose the new permissions to the UI so admins can assign them to roles.

### 2. React Hook Form Custom Handlers
- When using custom `onChange` handlers on select inputs registered with React Hook Form, **always** invoke the form's native handler inside the custom handler to maintain form state and watcher reactivity:
  ```tsx
  <select 
    {...register("field")} 
    onChange={(e) => {
      register("field").onChange(e);
      myCustomHandler(e.target.value);
    }}
  ```

### 4. Search Functionality
- **Global Search Support**: Whenever a new module or UI feature (like a list view) is created that is part of a larger page (e.g., Admin Panel, Inventory Panel), its search must be properly integrated with the global `searchQuery` state of the parent component.
- **Passing Props**: Make sure to pass `searchQuery={searchQuery}` to the sub-components and filter the displayed lists accordingly using `Array.prototype.filter()` so the user can easily find specific records.

### 5. UI Styling Conventions
- **Mandatory Fields**: Do not manually add `<span className="text-red-500">*</span>` to labels. Instead, apply the HTML5 `required` attribute directly to the `<input>` or `<select>` element. The global CSS in `index.css` (`label:has(+ *:required)::after`) will automatically append the red asterisk to the preceding `<label>`.

### 6. Item Type & UI Tags
- **Inventory Items** must have isAdminItem and isItItem booleans, and an optional asePrice.
- **UI Consistency**: In any list or approval detail view (e.g., PRs, Stock Transactions, Global Tasks Inbox), if an item is an admin or IT item, you MUST render a small badge tag (<span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold">ADMIN</span> and similarly for IT in purple) next to the item name.



### 7. Warehouse Managers & Item Type Scoping
- Users managing specific warehouse inventory must be mapped in warehouse_managers table (via Admin UI).
- Inventory item types (Admin, IT, Both) strictly govern permissions for **Stock In** and **Stock Out** operations per user per warehouse.
- GET /api/warehouses respects this mapping for non-admins, ensuring they only see their assigned warehouses.

### 8. User Branch Mapping
- User creation and updating **MUST** include a mandatory `branchId` to properly associate employees with physical or organizational branches.

### 9. PR Fulfillment Deduplication
- When resolving remaining items for an existing PR, the new PR creation workflow utilizes `pr_created_quantity` to remember which pending items were already ported to a new Requisition. Always recalculate pending quantities as `quantity - deliveredQuantity - prCreatedQuantity` to prevent duplicate PR cycles.

## ✅ Definition of Done

A task on SLI ERP is not finished until:

1. **Multi-tenant safety**: every new/changed Express route calls `let companyId = await resolveTenantId(req);` and has no cross-tenant fallback.
2. **RBAC wired**: new actions/menus/features check a specific `permissions` entry and are added to the `hierarchy` array in `Admin.tsx` (see `rbac-permissions.md`).
3. **Migrations run**: Any `schema.ts` change MUST be synced to the database. Run `npx drizzle-kit push` to apply changes.
   - **Agent Exception (TTY Error)**: If `drizzle-kit push` fails with an "Interactive prompts require a TTY terminal" error (which happens because agents cannot interact with CLI prompts), you MUST bypass Drizzle and write a temporary Node.js script using the `pg` client to execute the required raw SQL `ALTER TABLE` queries directly against the database, then delete the script. Never leave schema changes un-pushed.
4. **Docs updated — this is mandatory, not optional**:
   - If you added modules, changed backend routing, altered the DB schema, or shipped new UI features → update `DEVELOPER_GUIDE.md` to describe the change.
   - If architecture or routing logic changed → update `AGENTS.md` / this rules set too.
5. **No duplicate submits**: forms that POST wrap the call with an `isSubmitting` guard.
6. **Search wired**: any new list inside a larger panel is connected to that panel's global `searchQuery` state.
7. **Badges present**: item lists/approval views show ADMIN/IT badges where applicable.
8. **No manually-added red-asterisk spans on labels**. Local back buttons are REQUIRED in all form/view pages.

If any of the above doesn't apply to the current task, that's fine — just don't skip a step that does apply.

### 10. Procurement Lifecycle (P2P) Architecture
- **Purchase Requisition (PR)**: Created from Inventory Requisition List when items are not in stock. `purchase_requisitions.sourceIrId` links back to the original Item Requisition. Price per item is mandatory. Procurement method (`procurementMethod`) is manually selected by user: 'Single Quotation', 'Minimum 3 Quotations', 'RFQ with CS', 'Tender/RFP'.
- **PR Approval**: Uses BPMN workflow `documentType: 'Purchase Requisition'` — Head of Operations → CFO (2-step designation-based).
- **CS Evaluation Approval**: Uses BPMN workflow `documentType: 'CS Evaluation'` with exclusive gateway for amount-based sequential routing:
  - Amount ≤ 5000 BDT: Head of Operations.
  - Amount 5001 – 100000 BDT: Head of Operations → CEO.
  - Amount > 100000 BDT: Head of Operations → CEO → EC Committee.
- **Vendor Evaluation**: 7 fixed criteria in `vendor_evaluations` table: Price, Quality, Delivery Timeline, Vendor Experience, Warranty & Support, Financial Stability, Compliance Requirement. Each has a weight (%) and score (1-10).
- **Purchase Orders (PO)**: Handles both goods and services. Generates directly from approved CS.
- **All approvals** (PR, CS) flow through `inbox_tasks` and are actioned via the Global Tasks Inbox (`/inbox`), using `notifyApprovers` with `referenceType` ('PR', 'CS') and `referenceId`.

### 11. Dynamic Currency Symbol
- **Tenant-wise Currency**: Never use hardcoded currency symbols (like `$` or `৳`) in any UI module.
- **Implementation**: Always import the `useCurrency` hook from `@/src/shared/components/SettingsProvider` and use the returned `currencySymbol` variable to prefix monetary amounts (e.g., `{currencySymbol}{Number(amount).toLocaleString()}`).

### 12. Active Module Routing (Sidebar Visibility)
- **Sidebar Matching**: The `Layout.tsx` component relies on matching the current URL path to set the `activeModule` state (e.g., `'procurement'`, `'inventory'`). If a path is not matched in the `if/else` block, the sidebar menus will disappear.
- **Rule**: Whenever you add a new route (e.g., `/procurement-report`), you **MUST** ensure that the route is properly covered by the `path.startsWith()` or `path ===` checks in `Layout.tsx`'s `activeModule` determination logic. Use generic matching like `path.startsWith('/procurement')` whenever possible to automatically capture future sub-routes.

### 13. Deployment & Structural Changes
- **Agent Rule (Vercel)**: Do NOT deploy to Vercel (e.g. `npx vercel --prod`) without explicit permission from the user. You must wait for the user to explicitly tell you to deploy.
- **Agent Rule (Structural Changes)**: Before making any database schema changes, API route modifications, or major architectural/structural changes, you **MUST** ask for the user's permission first. Always present your plan and get the green light before proceeding with backend or DB modifications.
### 14. Drizzle Foreign Key Constraints (UID Cascade)
- **Agent Rule (Foreign Keys)**: Whenever you define a foreign key reference in `schema.ts` that points to `users.uid` (or any mutable unique string identifier rather than a serial primary key), you **MUST** explicitly add `{ onUpdate: 'cascade' }` in the `.references()` chain. 
- **Example**: `updatedBy: text('updated_by').references(() => users.uid, { onUpdate: 'cascade' })` 
- **Reason**: Supabase Auth UIDs can change if a user switches Identity Providers (e.g., from Password to Microsoft SSO). Without cascade updates, PostgreSQL will block the `users` table update and trigger a 500 Internal Server Error across the application.

### 15. MSAL loginPopup & Client-Side Routing
- **Agent Rule (Redirect URIs)**: When implementing `@azure/msal-browser` `loginPopup`, you **MUST NOT** set the `redirectUri` to a path that immediately triggers a client-side redirect (e.g., the root `/` path redirecting to `/login` via React Router).
- **Why**: Client-side redirects will strip the `#code=` or `#id_token=` hash fragments returned by Microsoft Entra ID before the parent window can parse them, causing the popup to hang and authentication to fail.
- **Solution**: Always set the MSAL `redirectUri` (and configure it in Azure Portal) to the exact final path that does not redirect (e.g., `window.location.origin + '/login'`).

### 16. User Registration / SSO Onboarding Architecture
- **Dynamic BPMN Workflow**: User Registration via SSO is **not** a hardcoded HR task. It must use the dynamic BPMN workflow engine with `documentType: 'User Registration'`.
- **Step Tracking**: Multi-step approvals for onboarding are stored in the `document_approvals` table.
- **Inbox Final Step Validation**: In the Global Inbox UI (`Inbox.tsx`), assigning a user's `Role`, `Branch`, `Department`, and `Designation` must be **optional/hidden** for intermediate approvers, but strictly **mandatory** for the final approver (`isFinalStep` logic).
- **Activation Lifecycle**: The user's status must remain `Pending HR Approval` (or `Pending Approval`) during intermediate steps. Only upon final approval should the user's status be updated to `Active` and the assigned organizational fields be saved to the `users` table.


### 17. Profile Data Change Architecture
- **Dynamic Workflow**: Profile change requests **must** go through the BPMN engine (`documentType: 'Profile Data Change Request'`).
- **Inbox Final Step Modification**: In the Global Inbox UI (`Inbox.tsx`), the final approver must be able to view **and edit/override** the requested profile fields (Role, Department, Designation, Branch, Supervisor, Phone) before final approval. 
- **Auto-Update**: The final approval API handler must seamlessly merge the approved data directly into the `users` table, ensuring role permissions and cascading foreign keys are respected, and then notify the user.

### 18. UI Conventions: Searchable Dropdowns
- **Avoid Native Selects for Large Datasets**: When implementing forms that require selecting from a potentially large list of options (e.g., Users, Departments, Designations, Branches), do NOT use standard HTML <select> elements.
- **Custom Implementation**: Implement a custom searchable dropdown component consisting of:
  1. A clickable trigger div that masquerades as an input (displaying the selected value and a chevron icon).
  2. A conditionally rendered bsolute positioned dropdown panel with a high z-index.
  3. A search <input> pinned to the top of the dropdown that filters the mapped options in real-time.
  4. An invisible ixed inset-0 backdrop overlay to handle clicking outside to close the dropdown.

### 19. Inbox Task Retrieval (Role vs. Designation)
- **Problem**: The BPMN engine frequently sets the ssignedToRole column in inbox_tasks to a user's *Designation* (e.g., 'CEO', 'Head of Operations') instead of their formal system *Role* (e.g., 'SLI Employee').
- **Agent Rule (Inbox Queries)**: Whenever you write or modify a query fetching tasks from inbox_tasks for a logged-in user (such as /api/inbox or dashboard metrics), you **MUST** ensure the ssignedToRole condition checks against EITHER the user's ole OR the user's designation.
- **Implementation**: Fetch the user's designation alongside their ole from the users table, and use a drizzle-orm or() condition: or(eq(inbox_tasks.assignedToRole, userRole), eq(inbox_tasks.assignedToRole, userDesignation)).

### 20. Dynamic Notifications
- **Web and Email Notifications**: Never hardcode email or web notifications. Any new notification logic MUST be added to `DEFAULT_NOTIFICATION_TEMPLATES` in `server.ts` so that it is dynamically manageable in the UI via the `notification_settings` table and menu.

### 21. Security & Footprint Prevention
- **Agent Rule (Security Standards)**: Always configure helmet for any new Express server setups to strip X-Powered-By headers and prevent framework footprinting. Ensure CORS is restricted using cors({ origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*', optionsSuccessStatus: 200 }). Never leave endpoints globally open without proper rate limiting (express-rate-limit).
