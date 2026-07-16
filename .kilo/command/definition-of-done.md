# SLI ERP — Definition of Done

A task on SLI ERP is not finished until:

1. **Multi-tenant safety**: every new/changed Express route calls `let companyId = await resolveTenantId(req);` and has no cross-tenant fallback.
2. **RBAC wired**: new actions/menus/features check a specific `permissions` entry and are added to the `hierarchy` array in `Admin.tsx` (see `rbac-permissions.md`).
3. **Migrations run**: any `schema.ts` change has a corresponding Drizzle migration — never hand-edit Supabase tables directly.
4. **Docs updated — this is mandatory, not optional**:
   - If you added modules, changed backend routing, altered the DB schema, or shipped new UI features → update `DEVELOPER_GUIDE.md` to describe the change.
   - If architecture or routing logic changed → update `AGENTS.md` / this rules set too.
5. **No duplicate submits**: forms that POST wrap the call with an `isSubmitting` guard.
6. **Search wired**: any new list inside a larger panel is connected to that panel's global `searchQuery` state.
7. **Badges present**: item lists/approval views show ADMIN/IT badges where applicable.
8. **No redundant back buttons, no manually-added red-asterisk spans on labels**.

If any of the above doesn't apply to the current task, that's fine — just don't skip a step that does apply.
