import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean, numeric, jsonb, uuid, uniqueIndex } from 'drizzle-orm/pg-core';

// --- Multi-Company & Plugins Architecture ---

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  isSsoEnabled: boolean('is_sso_enabled').default(false),
  ssoEmailDomain: text('sso_email_domain'),
  ssoClientId: text('sso_client_id'),
  ssoTenantId: text('sso_tenant_id'),
  ssoClientSecret: text('sso_client_secret'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const plugins = pgTable('plugins', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  version: text('version').default('1.0.0'),
  isCore: boolean('is_core').default(false),
});

export const company_plugins = pgTable('company_plugins', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }).notNull(),
  pluginId: uuid('plugin_id').references(() => plugins.id, { onDelete: 'cascade' }).notNull(),
  status: text('status').default('inactive'), // 'active' or 'inactive'
  settings: jsonb('settings'), // E.g. {"max_pr_amount": 50000, "require_qc": true}
}, (table) => ({
  companyPluginUnq: uniqueIndex('company_plugin_unq_idx').on(table.companyId, table.pluginId),
}));

export const branches = pgTable('branches', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  name: text('name').notNull(),
  address: text('address'),
  contactNumber: text('contact_number'),
  status: text('status').default('Active'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const warehouses = pgTable('warehouses', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  branchId: integer('branch_id').references(() => branches.id).notNull(),
  name: text('name').notNull(),
  location: text('location'),
  status: text('status').default('Active'),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- Existing Tables ---

export const warehouse_managers = pgTable('warehouse_managers', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.uid, { onDelete: 'cascade' }).notNull(),
  warehouseId: integer('warehouse_id').references(() => warehouses.id, { onDelete: 'cascade' }).notNull(),
  itemType: text('item_type').default('Both').notNull(), // 'Admin', 'IT', 'Both'
  createdAt: timestamp('created_at').defaultNow(),
});

// Users table (synced with Supabase Auth)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Supabase Auth UID
  companyId: uuid('company_id').references(() => companies.id), // Added for multi-tenancy
  branchId: integer('branch_id').references(() => branches.id), // Added for branch assignment
  email: text('email').notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'), // nullable avatar URL

  designation: text('designation'),
  phone: text('phone'),
  supervisorUid: text('supervisor_uid'),
  role: text('role').default('Requester'),
  department: text('department'),
  status: text('status').default('Active'), // 'Active' or 'Inactive'
  passwordHash: text('password_hash'), // Nullable hash for direct PostgreSQL native auth mode
  createdAt: timestamp('created_at').defaultNow(),
});

// Profile Change Requests table
export const profile_change_requests = pgTable('profile_change_requests', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  userId: integer('user_id').references(() => users.id),
  requestedData: jsonb('requested_data').notNull(),
  status: text('status').default('Pending'), // Pending, Approved, Rejected
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Roles table (Dynamic Roles)
export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id), // Multi-tenancy
  name: text('name').notNull(), // Removed global unique constraint
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  roleCompanyUnq: uniqueIndex('role_company_unq_idx').on(table.companyId, table.name),
}));

// Role Permissions (Dynamic access control)
export const role_permissions = pgTable('role_permissions', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  role: text('role').notNull(),
  module: text('module').notNull(), // 'pr', 'po', 'inventory', 'vendors', 'admin', 'user-panel'
  canView: boolean('can_view').default(false),
  canCreate: boolean('can_create').default(false),
  canEdit: boolean('can_edit').default(false),
  canDelete: boolean('can_delete').default(false),
  canApprove: boolean('can_approve').default(false),
}, (table) => ({
  permRoleModUnq: uniqueIndex('perm_role_mod_unq_idx').on(table.companyId, table.role, table.module),
}));

// User Panel Settings (global task definitions per company)
export const user_panel_settings = pgTable('user_panel_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }).notNull(),
  taskKey: text('task_key').notNull(),
  taskName: text('task_name').notNull(),
  defaultAssigneeUid: text('default_assignee_uid').references(() => users.uid),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// User Panel Permissions (per user permissions for the panel)
export const user_panel_permissions = pgTable('user_panel_permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.uid).notNull(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }).notNull(),
  canView: boolean('can_view').default(false),
  canEdit: boolean('can_edit').default(false),
  canAdmin: boolean('can_admin').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id), // Added for multi-tenancy
  parentId: integer('parent_id'), // Added for Organogram hierarchy
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  managerUid: text('manager_uid').references(() => users.uid),
  status: text('status').default('Active'),
});

export const units = pgTable('units', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  departmentId: integer('department_id').references(() => departments.id),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  managerUid: text('manager_uid').references(() => users.uid),
  status: text('status').default('Active'),
});

export const designations = pgTable('designations', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  status: text('status').default('Active'),
});

export const cost_centers = pgTable('cost_centers', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
});

// Vendors
export const vendors = pgTable('vendors', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  name: text('name').notNull(),
  bin: text('bin'),
  tin: text('tin'),
  contactPerson: text('contact_person'),
  email: text('email'),
  phone: text('phone'),
  bankName: text('bank_name'),
  branchName: text('branch_name'),
  accountName: text('account_name'),
  accountNumber: text('account_number'),
  routingNumber: text('routing_number'),
  status: text('status').default('Active'),
  rating: numeric('rating').default('0.0'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Purchase Requisitions
export const purchase_requisitions = pgTable('purchase_requisitions', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  prNumber: text('pr_number').notNull().unique(),
  requestor: text('requestor').notNull(),
  uid: text('uid').references(() => users.uid).notNull(),
  department: text('department').notNull(),
  costCenter: text('cost_center'),
  priority: text('priority').default('Normal'),
  estimatedCost: numeric('estimated_cost').notNull(),
  justification: text('justification'),
  status: text('status').default('Draft'), // Draft, Submitted, Budget Verification, Approved, Rejected
  deliveryStatus: text('delivery_status').default('Not Delivered'), // Not Delivered, Partially Delivered, Fully Delivered, PR Created
  sourceIrId: integer('source_ir_id'), // Links Purchase Requisition back to the original Item Requisition
  procurementMethod: text('procurement_method'), // 'Single Quotation', 'Minimum 3 Quotations', 'RFQ with CS', 'Tender/RFP'
  createdAt: timestamp('created_at').defaultNow(),
  requiredDate: timestamp('required_date'),
});

// PR Items
export const pr_items = pgTable('pr_items', {
  id: serial('id').primaryKey(),
  prId: integer('pr_id').references(() => purchase_requisitions.id).notNull(),
  itemId: integer('item_id'), // Can reference inventory_items.id
  itemName: text('item_name').notNull(),
  category: text('category'),
  quantity: integer('quantity').notNull(),
  uom: text('uom').notNull(), // Unit of Measure
  estimatedPrice: numeric('estimated_price'),
  deliveredQuantity: integer('delivered_quantity').default(0),
  prCreatedQuantity: integer('pr_created_quantity').default(0),
});

// BPMN Dynamic Workflow Definitions
export const bpmn_definitions = pgTable('bpmn_definitions', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  documentType: text('document_type').default('PR').notNull(), // 'PR', 'CS', 'PO', 'Invoice'
  department: text('department').notNull(), // which department this applies to, or 'Global'
  name: text('name').notNull(),
  xmlData: text('xml_data').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// BPMN Instances (Running workflows)
export const bpmn_instances = pgTable('bpmn_instances', {
  id: serial('id').primaryKey(),
  definitionId: integer('definition_id').references(() => bpmn_definitions.id).notNull(),
  documentType: text('document_type').notNull(), // e.g., 'PR'
  documentId: integer('document_id').notNull(),
  engineState: text('engine_state'), // JSON dump of the engine's current state
  status: text('status').default('Running'), // 'Running', 'Completed', 'Errored'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Approval Workflows (Legacy - Keeping for backward compatibility temporarily)
export const approval_workflows = pgTable('approval_workflows', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  documentType: text('document_type').default('PR').notNull(),
  department: text('department').notNull(),
  stepOrder: integer('step_order').notNull(),
  roleRequired: text('role_required').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// PR Approvals (Tracking specific PR approvals - keeping legacy support)
export const pr_approvals = pgTable('pr_approvals', {
  id: serial('id').primaryKey(),
  prId: integer('pr_id').references(() => purchase_requisitions.id).notNull(),
  stepOrder: integer('step_order').notNull(),
  roleRequired: text('role_required').notNull(),
  assigneeType: text('assignee_type').default('Department Role'), // 'Department Role', 'Global Role', 'Designation'
  assigneeValue: text('assignee_value'),
  status: text('status').default('Pending'), // Pending, Approved, Rejected
  approvedBy: text('approved_by').references(() => users.uid),
  comments: text('comments'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Generalized Document Approvals
export const document_approvals = pgTable('document_approvals', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  documentType: text('document_type').notNull(), // 'PR', 'CS', 'PO', 'Invoice'
  documentId: integer('document_id').notNull(),
  stepOrder: integer('step_order').notNull(),
  roleRequired: text('role_required').notNull(),
  assigneeType: text('assignee_type').default('Department Role'),
  assigneeValue: text('assignee_value'),
  status: text('status').default('Pending'), // Pending, Approved, Rejected
  approvedBy: text('approved_by').references(() => users.uid),
  comments: text('comments'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// RFQ (Request for Quotation)
export const rfq = pgTable('rfq', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  rfqNumber: text('rfq_number').notNull().unique(),
  prId: integer('pr_id').references(() => purchase_requisitions.id).notNull(),
  deadline: timestamp('deadline'),
  status: text('status').default('Open'), // Open, Closed
  createdAt: timestamp('created_at').defaultNow(),
});

// RFQ Invited Vendors
export const rfq_vendors = pgTable('rfq_vendors', {
  id: serial('id').primaryKey(),
  rfqId: integer('rfq_id').references(() => rfq.id).notNull(),
  vendorId: integer('vendor_id').references(() => vendors.id).notNull(),
});

// Quotations submitted by Vendors
export const quotations = pgTable('quotations', {
  id: serial('id').primaryKey(),
  rfqId: integer('rfq_id').references(() => rfq.id).notNull(),
  vendorId: integer('vendor_id').references(() => vendors.id).notNull(),
  prItemId: integer('pr_item_id').references(() => pr_items.id).notNull(),
  quotedPrice: numeric('quoted_price').notNull(),
  deliveryDays: integer('delivery_days'),
  remarks: text('remarks'),
  attachmentUrl: text('attachment_url'),
  vatPercent: numeric('vat_percent').default('0'),
  vatAmount: numeric('vat_amount').default('0'),
  taxPercent: numeric('tax_percent').default('0'),
  taxAmount: numeric('tax_amount').default('0'),
  totalAmount: numeric('total_amount'),
  description: text('description'),
});

// Comparative Statements
export const comparative_statements = pgTable('comparative_statements', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  csNumber: text('cs_number').notNull().unique(),
  rfqId: integer('rfq_id').references(() => rfq.id).notNull(),
  prId: integer('pr_id').references(() => purchase_requisitions.id).notNull(),
  selectedVendorId: integer('selected_vendor_id').references(() => vendors.id),
  status: text('status').default('Draft'), // Draft, Pending Approval, Approved, Rejected
  justification: text('justification'),
  totalAmount: numeric('total_amount'), // Total evaluated amount for BPMN approval routing
  evaluationType: text('evaluation_type').default('Full Evaluation'), // 'CS Only', 'Full Evaluation', 'No CS Required'
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: text('created_by').references(() => users.uid),
});

// Purchase Orders
export const purchase_orders = pgTable('purchase_orders', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  poNumber: text('po_number').notNull().unique(),
  prId: integer('pr_id').references(() => purchase_requisitions.id).notNull(),
  csId: integer('cs_id'), // optional link to CS
  vendorId: integer('vendor_id').references(() => vendors.id).notNull(),
  totalAmount: numeric('total_amount').notNull(),
  status: text('status').default('Draft'), // Draft, Pending Approval, Approved, Sent, Delivered, Closed
  deliveryDate: timestamp('delivery_date'),
  paymentTerms: text('payment_terms'),
  warrantyTerms: text('warranty_terms'),
  deliverySchedule: text('delivery_schedule'),
  createdBy: text('created_by').references(() => users.uid),
  createdAt: timestamp('created_at').defaultNow(),
});

// Work Orders (Generated from Approved CS/PO with pre-print editing & signed upload requirement)
export const work_orders = pgTable('work_orders', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  woNumber: text('wo_number').notNull().unique(),
  csId: integer('cs_id').references(() => comparative_statements.id),
  poId: integer('po_id').references(() => purchase_orders.id),
  prId: integer('pr_id').references(() => purchase_requisitions.id),
  vendorId: integer('vendor_id').references(() => vendors.id).notNull(),
  subject: text('subject'),
  attnPerson: text('attn_person'),
  quotationRefNo: text('quotation_ref_no'),
  quotationDate: timestamp('quotation_date'),
  deliveryAddress: text('delivery_address'),
  officeContactName: text('office_contact_name'),
  officeContactPhone: text('office_contact_phone'),
  officeContactEmail: text('office_contact_email'),
  totalAmount: numeric('total_amount'),
  vatAmount: numeric('vat_amount'),
  taxAmount: numeric('tax_amount'),
  grandTotal: numeric('grand_total'),
  termsConditions: jsonb('terms_conditions'), // JSON array of instruction strings
  signedFileUrl: text('signed_file_url'),
  signedUploadedAt: timestamp('signed_uploaded_at'),
  signedUploadedBy: text('signed_uploaded_by').references(() => users.uid),
  status: text('status').default('Pending Signed Upload'), // Pending Signed Upload, Signed & Active, Cancelled
  createdBy: text('created_by').references(() => users.uid),
  createdAt: timestamp('created_at').defaultNow(),
});

// Purchase Order Items
export const po_items = pgTable('po_items', {
  id: serial('id').primaryKey(),
  poId: integer('po_id').references(() => purchase_orders.id).notNull(),
  itemName: text('item_name').notNull(),
  quantity: integer('quantity').notNull(),
  uom: text('uom').notNull(),
  unitPrice: numeric('unit_price').notNull(),
});

// Goods Receive Note (GRN)
export const grn = pgTable('grn', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  warehouseId: integer('warehouse_id').references(() => warehouses.id),
  grnNumber: text('grn_number').notNull().unique(),
  poId: integer('po_id').references(() => purchase_orders.id).notNull(),
  receivedDate: timestamp('received_date').defaultNow(),
  receivedBy: text('received_by').references(() => users.uid),
  status: text('status').default('Pending QC'), // Pending QC, QC Completed, Closed
  createdAt: timestamp('created_at').defaultNow(),
});

// GRN Items
export const grn_items = pgTable('grn_items', {
  id: serial('id').primaryKey(),
  grnId: integer('grn_id').references(() => grn.id).notNull(),
  poItemId: integer('po_item_id').references(() => po_items.id).notNull(),
  quantityReceived: integer('quantity_received').notNull(),
  status: text('status').default('Pending QC'), // Pending QC, Passed, Failed
  batchNumber: text('batch_number'), // Optional batch number from supplier
  expiryDate: timestamp('expiry_date'), // Optional expiry date for perishables
});

// QC Inspections
export const qc_inspections = pgTable('qc_inspections', {
  id: serial('id').primaryKey(),
  grnItemId: integer('grn_item_id').references(() => grn_items.id).notNull(),
  inspectedQty: integer('inspected_qty').notNull(),
  passedQty: integer('passed_qty').notNull(),
  failedQty: integer('failed_qty').notNull(),
  remarks: text('remarks'),
  inspectedBy: text('inspected_by').references(() => users.uid),
  inspectedAt: timestamp('inspected_at').defaultNow(),
  // Phase 1 additions: QC defect tracking
  defectCategory: text('defect_category'), // Material Defect, Quantity Short, Packaging Damage, Wrong Item, Other
  defectDescription: text('defect_description'),
  costOfDefect: numeric('cost_of_defect'),
});

// Rejected Item Dispositions (Phase 1 - QC failure workflow)
export const rejected_item_dispositions = pgTable('rejected_item_dispositions', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  qcInspectionId: integer('qc_inspection_id').references(() => qc_inspections.id).notNull(),
  grnId: integer('grn_id').references(() => grn.id).notNull(),
  grnItemId: integer('grn_item_id').references(() => grn_items.id).notNull(),
  itemId: integer('item_id').references(() => inventory_items.id),
  itemName: text('item_name').notNull(),
  quantityRejected: integer('quantity_rejected').notNull(),
  dispositionType: text('disposition_type'), // 'Return_to_Vendor', 'Scrap', 'Rework'
  status: text('status').default('Pending'), // Pending, In_Process, Completed
  vendorCreditNoteNumber: text('vendor_credit_note_number'),
  notes: text('notes'),
  disposedByUid: text('disposed_by_uid').references(() => users.uid),
  disposedAt: timestamp('disposed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Invoices (3-Way Matching)
export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  invoiceNumber: text('invoice_number').notNull().unique(),
  poId: integer('po_id').references(() => purchase_orders.id).notNull(),
  grnId: integer('grn_id').references(() => grn.id).notNull(),
  amount: numeric('amount').notNull(),
  invoiceDate: timestamp('invoice_date'),
  status: text('status').default('Pending'), // Pending, Paid
  matchingNotes: text('matching_notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Payments
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  paymentNumber: text('payment_number').notNull().unique(),
  invoiceId: integer('invoice_id').references(() => invoices.id).notNull(),
  paymentMethod: text('payment_method').notNull(),
  amountPaid: numeric('amount_paid').notNull(),
  paidAt: timestamp('paid_at').defaultNow(),
  referenceNumber: text('reference_number'),
  status: text('status').default('Pending'), // Pending, Completed
});

// Item Categories
export const item_categories = pgTable('item_categories', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id), // Added for multi-tenancy
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').default('Active'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Inventory
export const inventory_items = pgTable('inventory_items', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id), // Added for multi-tenancy
  itemCode: text('item_code').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(), // Consumable, Fixed Asset, IT Equipment
  quantityInStock: integer('quantity_in_stock').default(0),
  reservedQuantity: integer('reserved_quantity').default(0), // Phase 1: Soft reservation for pending stock-outs
  uom: text('uom').notNull(),
  reorderLevel: integer('reorder_level').default(0),
  reorderPoint: integer('reorder_point').default(0), // Phase 1: Trigger point for low-stock alert
  reorderQuantity: integer('reorder_quantity').default(0), // Phase 1: Default qty to order
  leadTimeDays: integer('lead_time_days').default(7), // Phase 1: Avg days from order to receipt
  safetyStockDays: integer('safety_stock_days').default(3), // Phase 1: Buffer days
  abcClassification: text('abc_classification'), // Phase 1: 'A', 'B', 'C'
  avgDailyConsumption: numeric('avg_daily_consumption'), // Phase 1: Auto-calculated
  location: text('location'),
  isFixedAsset: boolean('is_fixed_asset').default(false),
  basePrice: numeric('base_price'),
  isAdminItem: boolean('is_admin_item').default(false),
  isItItem: boolean('is_it_item').default(false),
});

export const stock_transactions = pgTable('stock_transactions', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  itemId: integer('item_id').references(() => inventory_items.id).notNull(),
  warehouseId: integer('warehouse_id').references(() => warehouses.id),
  vendorId: integer('vendor_id').references(() => vendors.id),
  transactionType: text('transaction_type').notNull(), // Stock In, Stock Out, GRN, Issue, Adjustment
  quantity: integer('quantity').notNull(),
  referenceId: text('reference_id'), // e.g. PO Number, PR Number, or StockOut Request ID
  createdAt: timestamp('created_at').defaultNow(),
  performedBy: text('performed_by').references(() => users.uid),
});

export const stock_transfers = pgTable('stock_transfers', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  transferNumber: text('transfer_number').notNull().unique(),
  sourceWarehouseId: integer('source_warehouse_id').references(() => warehouses.id).notNull(),
  destinationWarehouseId: integer('destination_warehouse_id').references(() => warehouses.id).notNull(),
  status: text('status').default('Pending Approval'), // Pending Approval, In Transit, Received, Cancelled
  requestedBy: text('requested_by').references(() => users.uid),
  dispatchDate: timestamp('dispatch_date'), // Phase 1: When stock left source warehouse
  expectedArrivalDate: timestamp('expected_arrival_date'), // Phase 1: Expected receipt date
  actualArrivalDate: timestamp('actual_arrival_date'), // Phase 1: Actual receipt date
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const stock_transfer_items = pgTable('stock_transfer_items', {
  id: serial('id').primaryKey(),
  transferId: integer('transfer_id').references(() => stock_transfers.id).notNull(),
  itemId: integer('item_id').references(() => inventory_items.id).notNull(),
  quantity: integer('quantity').notNull(),
});

export const stock_out_requests = pgTable('stock_out_requests', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  requestNumber: text('request_number').notNull().unique(),
  warehouseId: integer('warehouse_id').references(() => warehouses.id),
  itemId: integer('item_id').references(() => inventory_items.id).notNull(),
  quantity: integer('quantity').notNull(),
  reason: text('reason').notNull(),
  status: text('status').default('Pending'), // Pending, Approved, Rejected
  requestedBy: text('requested_by').references(() => users.uid),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const global_stock_ledger = pgTable('global_stock_ledger', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  itemId: integer('item_id').references(() => inventory_items.id).notNull(),
  openingBalance: integer('opening_balance').default(0),
  totalStockIn: integer('total_stock_in').default(0),
  totalStockOut: integer('total_stock_out').default(0),
  closingBalance: integer('closing_balance').default(0),
  lastUpdated: timestamp('last_updated').defaultNow(),
});

export const warehouse_stock = pgTable('warehouse_stock', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  warehouseId: integer('warehouse_id').references(() => warehouses.id).notNull(),
  itemId: integer('item_id').references(() => inventory_items.id).notNull(),
  quantity: integer('quantity').default(0),
  reservedQuantity: integer('reserved_quantity').default(0), // Phase 1: Qty reserved for pending approvals
  batchNumber: text('batch_number'), // Phase 1: Optional batch tracking
  expiryDate: timestamp('expiry_date'), // Phase 1: Optional expiry tracking
  lastUpdated: timestamp('last_updated').defaultNow(),
});

// Audit Logs
export const audit_logs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  uid: text('uid').references(() => users.uid),
  details: jsonb('details'),
  createdAt: timestamp('created_at').defaultNow(),
});

// System Settings (Global Configurations)
export const system_settings = pgTable('system_settings', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  value: text('value').notNull(), // Can store JSON strings or base64 data
  updatedAt: timestamp('updated_at').defaultNow(),
  updatedBy: text('updated_by').references(() => users.uid),
}, (table) => ({
  companyKeyUnq: uniqueIndex('company_key_unq_idx').on(table.companyId, table.key),
}));

// Notifications
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.uid).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').default('INFO'),
  link: text('link'),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const notification_settings = pgTable('notification_settings', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }).notNull(),
  actionEvent: text('action_event').notNull(),
  module: text('module').notNull(),
  titleTemplate: text('title_template').notNull(),
  bodyTemplate: text('body_template').notNull(),
  isActive: boolean('is_active').default(true),
  
  isMailActive: boolean('is_mail_active').default(false),
  mailSubjectTemplate: text('mail_subject_template'),
  mailBodyTemplate: text('mail_body_template'),

  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  companyEventUnq: uniqueIndex('company_event_unq_idx').on(table.companyId, table.actionEvent),
}));

export const smtp_settings = pgTable('smtp_settings', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }).unique().notNull(),
  host: text('host').notNull(),
  port: integer('port').notNull(),
  secure: boolean('secure').default(false).notNull(),
  username: text('username').notNull(),
  password: text('password').notNull(),
  fromEmail: text('from_email').notNull(),
  fromName: text('from_name').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Global Inbox Tasks (Gmail-like)
export const inbox_tasks = pgTable('inbox_tasks', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  assignedToUid: text('assigned_to_uid').references(() => users.uid),
  assignedToRole: text('assigned_to_role'),
  category: text('category').notNull(), // 'Procurement', 'Inventory', 'System', etc.
  title: text('title').notNull(),
  message: text('message'),
  actionLink: text('action_link'), // e.g., '/inventory/stock-out?id=123'
  referenceType: text('reference_type'), // e.g., 'StockOut', 'PR', 'CS'
  referenceId: integer('reference_id'),
  status: text('status').default('Pending'), // 'Pending', 'Completed', 'Archived'
  actionResult: text('action_result'), // e.g., 'Approved', 'Rejected', 'Sent for Review'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Vendor Evaluations (7-criteria weighted scoring)
export const vendor_evaluations = pgTable('vendor_evaluations', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  csId: integer('cs_id').references(() => comparative_statements.id, { onDelete: 'cascade' }).notNull(),
  vendorId: integer('vendor_id').references(() => vendors.id, { onDelete: 'cascade' }).notNull(),
  criteriaName: text('criteria_name').notNull(), // 'Price', 'Quality', 'Delivery Timeline', 'Vendor Experience', 'Warranty & Support', 'Financial Stability', 'Compliance Requirement'
  weight: numeric('weight').notNull(), // Percentage weight e.g. 20.0
  score: numeric('score').notNull(), // Score 1-10
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================================
// Phase 1 New Tables: Stock Reservation, Reconciliation, etc.
// ============================================================

// Stock Reservations (Soft-lock pending stock-out quantities to prevent over-allocation)
export const stock_reservations = pgTable('stock_reservations', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  warehouseId: integer('warehouse_id').references(() => warehouses.id).notNull(),
  itemId: integer('item_id').references(() => inventory_items.id).notNull(),
  stockOutRequestId: integer('stock_out_request_id').references(() => stock_out_requests.id).notNull(),
  reservedQty: integer('reserved_qty').notNull(),
  reservationDate: timestamp('reservation_date').defaultNow(),
  expiresAt: timestamp('expires_at'), // Auto-expire after 7 days
  status: text('status').default('Active'), // Active, Approved, Released, Expired
  createdAt: timestamp('created_at').defaultNow(),
});

// Physical Stock Counts (Reconciliation module)
export const physical_stock_counts = pgTable('physical_stock_counts', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  warehouseId: integer('warehouse_id').references(() => warehouses.id).notNull(),
  countNumber: text('count_number').notNull().unique(), // Auto: PSC-YYYYMMDD-XXXX
  countType: text('count_type').default('Spot-Check'), // Annual, Cycle, Spot-Check
  status: text('status').default('Pending'), // Pending, In-Progress, Completed, Approved
  scheduledDate: timestamp('scheduled_date').notNull(),
  actualStartDate: timestamp('actual_start_date'),
  completedDate: timestamp('completed_date'),
  countingTeam: text('counting_team'), // Comma-separated user names
  totalItemsCounted: integer('total_items_counted').default(0),
  totalVariances: integer('total_variances').default(0),
  totalVarianceValue: numeric('total_variance_value').default('0'),
  notes: text('notes'),
  approvedByUid: text('approved_by_uid').references(() => users.uid),
  approvedAt: timestamp('approved_at'),
  createdByUid: text('created_by_uid').references(() => users.uid),
  createdAt: timestamp('created_at').defaultNow(),
});

// Physical Count Details (Line-level count entries)
export const physical_count_details = pgTable('physical_count_details', {
  id: serial('id').primaryKey(),
  countId: integer('count_id').references(() => physical_stock_counts.id).notNull(),
  itemId: integer('item_id').references(() => inventory_items.id).notNull(),
  warehouseStockId: integer('warehouse_stock_id').references(() => warehouse_stock.id),
  systemQty: integer('system_qty').notNull(), // What the system shows
  physicalQty: integer('physical_qty'), // What was physically counted (null = not yet counted)
  varianceQty: integer('variance_qty'), // physical - system (auto-calculated)
  varianceValue: numeric('variance_value'), // varianceQty * basePrice
  varianceReason: text('variance_reason'), // Theft, Damage, Data Entry Error, Expired, Other
  adjusted: boolean('adjusted').default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Stock Adjustments (Formal approved corrections after physical count)
export const stock_adjustments = pgTable('stock_adjustments', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  countId: integer('count_id').references(() => physical_stock_counts.id),
  itemId: integer('item_id').references(() => inventory_items.id).notNull(),
  warehouseId: integer('warehouse_id').references(() => warehouses.id).notNull(),
  adjustmentQty: integer('adjustment_qty').notNull(), // Positive = add, Negative = deduct
  reason: text('reason').notNull(),
  adjustedFromQty: integer('adjusted_from_qty').notNull(),
  adjustedToQty: integer('adjusted_to_qty').notNull(),
  adjustedByUid: text('adjusted_by_uid').references(() => users.uid).notNull(),
  approvedByUid: text('approved_by_uid').references(() => users.uid),
  status: text('status').default('Pending'), // Pending, Approved, Rejected
  createdAt: timestamp('created_at').defaultNow(),
});

// Vendor Quality Metrics (Auto-updated after each QC completion)
export const vendor_quality_metrics = pgTable('vendor_quality_metrics', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  vendorId: integer('vendor_id').references(() => vendors.id).notNull(),
  evaluationMonth: text('evaluation_month').notNull(), // YYYY-MM format
  totalGrnCount: integer('total_grn_count').default(0),
  totalItemsReceived: integer('total_items_received').default(0),
  totalItemsRejected: integer('total_items_rejected').default(0),
  rejectionRate: numeric('rejection_rate').default('0'), // Percentage
  costOfRejections: numeric('cost_of_rejections').default('0'),
  defectCategories: jsonb('defect_categories'), // { "Material Defect": 3, "Packaging Damage": 1 }
  qualityScore: numeric('quality_score').default('10'), // 0.00-10.00
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  vendorMonthUnq: uniqueIndex('vendor_month_unq_idx').on(table.vendorId, table.evaluationMonth),
}));

// Stock Consumption History (For demand forecasting and reorder calculation)
export const stock_consumption_history = pgTable('stock_consumption_history', {
  id: serial('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  warehouseId: integer('warehouse_id').references(() => warehouses.id).notNull(),
  itemId: integer('item_id').references(() => inventory_items.id).notNull(),
  consumptionDate: text('consumption_date').notNull(), // YYYY-MM-DD
  consumedQty: integer('consumed_qty').notNull(),
  referenceId: text('reference_id'), // Stock-out request ID or number
  createdAt: timestamp('created_at').defaultNow(),
});

