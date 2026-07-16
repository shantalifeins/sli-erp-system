# SLI ERP — Project Overview

## Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express (TypeScript)
- **Database**: PostgreSQL (hosted on Supabase) via Drizzle ORM
- **Auth**: Supabase Auth (JWT)
- **Workflow Engine**: Custom BPMN engine using `bpmn-js` with dynamic role/designation routing
- **Icons**: `lucide-react`

## Multi-Tenancy (SaaS)
- Almost every table has a `companyId` (UUID) column.
- Express requests resolve the tenant with `resolveTenantId(req)` (uses `x-tenant-id` header).
- **Every route MUST call** `let companyId = await resolveTenantId(req);`
- **Never** do cross-tenant fallback (e.g. defaulting to "the first company").

## Plugin Architecture
- `plugins` table: defines available modules (Procurement, Inventory, User Panel, etc).
- `company_plugins` table: tracks which modules are active per company (feature-flagging per tenant).
- On server startup (`server.ts`), a seed check ensures core plugins (e.g. `user-panel`) exist.
- **Frontend**: `PluginProtectedRoute` checks `company_plugins` before rendering any plugin-specific page.

## Project Structure
```
/src
  /assets         # Static images, styles (index.css)
  /modules        # Domain-driven modules
    /admin        # SaaS Admin, System Settings, Organogram, Workflow Designer
    /auth         # Login page
    /home         # Home (module selector), Inbox (Global Tasks)
    /procurement  # PR, PO, RFQ, CS, Vendors, Invoices
    /inventory    # Stock, GRN, QC
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

## Sidebar / Module Routing (Layout.tsx)
- `activeModule` is derived from `location.pathname` via `startsWith()`. Order matters — check most specific paths first:
  - `/inbox`, `/my-tasks`, `/profile`, `/item-requisition` → `user-panel` (checked FIRST, before `/admin`)
  - `/admin/**` → `admin`
  - `/procurement-dashboard`, `/pr-*`, `/purchase`, `/vendors`, `/rfq`, `/cs`, `/invoices` → `procurement`
  - `/inventory-dashboard`, `/inventory`, `/grn`, `/qc`, `/stock-*`, `/requisition-list` → `inventory`
- `/my-tasks` is redirected to `/inbox` (unified task inbox).

## Adding a New Module/Plugin
1. Create `src/modules/<name>/` with `pages/` and `api/routes.ts`.
2. Register the plugin slug in the `plugins` table (or the auto-seed block in `server.ts`).
3. Register the Express router in `server.ts`: `app.use('/api/<name>', <nameRouter>)`.
4. Add React routes in `src/App.tsx` wrapped in `<PluginProtectedRoute pluginSlug="<name>">`.
5. Add sidebar entries in `src/shared/components/Layout.tsx` under the correct `*Menus` array.
6. Add a card to `src/modules/home/pages/Home.tsx` for the module selector.
7. **Immediately** wire it into RBAC — see `rbac-permissions.md`.
