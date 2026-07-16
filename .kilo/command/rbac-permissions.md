# SLI ERP — Permissions, RBAC & Warehouse Scoping

## Strict Integration Requirement
Whenever a new action, event, menu, or feature is created, it **MUST immediately** be brought under the plugin/module system and RBAC. Never ship a feature disconnected from `permissions`.

Every feature must explicitly check its own permission, e.g.:
```ts
isSuperAdmin || getPermission('Feature Name')?.canView
```

Update the `hierarchy` array in `Admin.tsx` to expose new permissions in the UI so admins can assign them to roles.

## Warehouse Managers & Item-Type Scoping
- Users managing specific warehouse inventory are mapped via the `warehouse_managers` table (configured in the Admin UI's `WarehouseManagerTab`).
- Inventory item types (`Admin`, `IT`, `Both`) strictly govern who can **Stock In** / **Stock Out**, per user, per warehouse.
- `GET /api/warehouses` must respect this mapping for non-admin users so they only see their assigned warehouses.
- Admin endpoints: `POST` / `GET` / `DELETE /api/admin/warehouse-managers`.
- Super Admin / Admin roles bypass all of the above and have global access.

## User Branch Mapping
- User creation and update must include a **mandatory** `branchId` to associate the employee with a physical/organizational branch.

## Item Type & UI Tags
- Inventory items must carry `isAdminItem` and `isItItem` booleans, plus optional `basePrice`.
- In any list or approval-detail view (PRs, Stock Transactions, Global Tasks Inbox), if an item is admin/IT, render a small badge next to the item name:
  - **ADMIN**: `<span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold">ADMIN</span>`
  - **IT**: purple variant (same classes, different color)
