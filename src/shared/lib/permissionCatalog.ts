export const permissionHierarchy = [
  {
    module: "Procurement",
    menus: [
      { name: "Procurement Dashboard", actions: ["canView"] },
      { name: "Purchase Requisitions", actions: ["canView", "canCreate", "canEdit", "canDelete", "canApprove"] },
      { name: "RFQ (Quotation)", actions: ["canView", "canCreate", "canEdit"] },
      { name: "Comparative Statement", actions: ["canView", "canCreate", "canEdit", "canApprove"] },
      { name: "Purchase Orders", actions: ["canView", "canCreate", "canEdit", "canApprove"] },
      { name: "Work Orders", actions: ["canView"] },
      { name: "Invoices & Payments", actions: ["canView", "canCreate", "canEdit", "canApprove"] },
      { name: "Vendors", actions: ["canView", "canCreate", "canEdit"] },
      { name: "Procurement Reports", actions: ["canView"] }
    ]
  },
  {
    module: "Inventory Management",
    menus: [
      { name: "Inventory Dashboard", actions: ["canView"] },
      { name: "Requisition Approval", actions: ["canView", "canCreate", "canApprove"] },
      { name: "Stock In", actions: ["canView", "canCreate"] },
      { name: "Stock Out", actions: ["canView", "canCreate", "canApprove"] },
      { name: "Stock Transfer", actions: ["canView", "canCreate"] },
      { name: "Transfer Receive", actions: ["canView", "canCreate"] },
      { name: "Goods Receipt (GRN)", actions: ["canView", "canCreate", "canApprove"] },
      { name: "Rejected Items", actions: ["canView"] },
      { name: "Stock Reconciliation", actions: ["canView", "canCreate", "canEdit", "canApprove"] },
      { name: "Inventory Items", actions: ["canView", "canCreate", "canEdit", "canDelete"] },
      { name: "Item Bulk Upload", actions: ["canView", "canCreate"] },
      { name: "Opening Stock Upload", actions: ["canView", "canCreate", "canApprove"] },
      { name: "Stock Adjustment", actions: ["canView", "canCreate", "canApprove"] },
      { name: "Inventory Reports", actions: ["canView"] },
      { name: "Requisition Report", actions: ["canView"] }
    ]
  },
  {
    module: "System Configuration",
    menus: [
      { name: "Admin Dashboard", actions: ["canView"] },
      { name: "System Setting", actions: ["canView", "canEdit"] },
      { name: "Company Profile", actions: ["canView", "canEdit"] },
      { name: "Branches", actions: ["canView", "canCreate", "canEdit"] },
      { name: "User Setting", actions: ["canView", "canCreate", "canEdit", "canDelete"] },
      { name: "Departments", actions: ["canView", "canCreate", "canEdit"] },
      { name: "Units", actions: ["canView", "canCreate", "canEdit"] },
      { name: "Designations", actions: ["canView", "canCreate"] },
      { name: "Warehouses", actions: ["canView", "canCreate", "canEdit"] },
      { name: "Workflow Engine", actions: ["canView", "canCreate", "canEdit", "canDelete"] }
    ]
  },
  {
    module: "User Panel",
    menus: [
      { name: "User Dashboard", actions: ["canView"] },
      { name: "Global Tasks", actions: ["canView"] },
      { name: "To-Do List", actions: ["canView", "canCreate", "canEdit", "canDelete"] },
      { name: "Item Requisitions", actions: ["canView", "canCreate", "canEdit", "canDelete", "canApprove"] },
      { name: "My Profile", actions: ["canView", "canEdit"] }
    ]
  },
  {
    module: "Asset Management - Fixed",
    menus: [
      { name: "Asset Dashboard", actions: ["canView"] },
      { name: "Assets Register", actions: ["canView", "canCreate", "canEdit", "canDelete", "canApprove"] },
      { name: "Asset Capitalization", actions: ["canView", "canApprove"] },
      { name: "Asset Assignment", actions: ["canView", "canCreate"] },
      { name: "Asset Import", actions: ["canView", "canCreate"] },
      { name: "Asset Categories", actions: ["canView", "canCreate", "canEdit", "canDelete"] },
      { name: "Asset Location", actions: ["canView", "canCreate", "canEdit", "canDelete"] },
      { name: "Asset Transfers", actions: ["canView", "canCreate", "canEdit", "canDelete", "canApprove"] },
      { name: "Asset Maintenance", actions: ["canView", "canCreate", "canEdit", "canDelete"] },
      { name: "Asset Disposal", actions: ["canView", "canCreate", "canEdit", "canDelete", "canApprove"] },
      { name: "Physical Audit", actions: ["canView", "canCreate", "canEdit"] }
    ]
  },
  {
    module: "Asset Management - Digital",
    menus: [
      { name: "Digital Asset Register", actions: ["canView", "canCreate", "canEdit", "canDelete", "canApprove"] },
      { name: "Digital Acceptance", actions: ["canView", "canCreate", "canApprove"] },
      { name: "License Secret Reveal", actions: ["canView"] },
      { name: "Digital Asset Import", actions: ["canView", "canCreate"] },
      { name: "Digital Subscriptions", actions: ["canView", "canCreate", "canEdit"] },
      { name: "License Vault", actions: ["canView", "canCreate", "canEdit", "canDelete"] },
      { name: "Digital Amortization", actions: ["canView", "canCreate"] }
    ]
  },
  {
    module: "Asset Management - Reports",
    menus: [
      { name: "Asset Reports", actions: ["canView"] },
      { name: "Digital Asset Reports", actions: ["canView"] },
      { name: "Depreciation Reports", actions: ["canView"] },
      { name: "Depreciation Schedule", actions: ["canView", "canCreate"] }
    ]
  },
  {
    module: "Shared Components",
    menus: [
      { name: "Attachments", actions: ["canView", "canCreate", "canDelete"] }
    ]
  },
  {
    module: "Reports & Analytics",
    menus: [
      { name: "Traceability Report", actions: ["canView"] }
    ]
  }
];
