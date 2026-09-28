CREATE TABLE "asset_attributes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"attribute_type" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "asset_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"default_depreciation_method" text DEFAULT 'Straight Line' NOT NULL,
	"default_useful_life_months" integer DEFAULT 36 NOT NULL,
	"default_salvage_percent" numeric DEFAULT '0.00',
	"default_declining_rate" numeric DEFAULT '0.00',
	"default_maintenance_interval" text DEFAULT 'None',
	"default_maintenance_type" text DEFAULT 'Preventive',
	"fixed_asset_account" text,
	"depreciation_account" text,
	"expense_account" text,
	"status" text DEFAULT 'Active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "asset_depreciation_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"period_number" integer NOT NULL,
	"period_date" timestamp NOT NULL,
	"depreciation_amount" numeric NOT NULL,
	"accumulated_depreciation" numeric NOT NULL,
	"book_value_after" numeric NOT NULL,
	"status" text DEFAULT 'Scheduled' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "asset_disposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"disposal_type" text NOT NULL,
	"disposal_date" timestamp NOT NULL,
	"sale_amount" numeric DEFAULT '0.00' NOT NULL,
	"book_value_at_disposal" numeric NOT NULL,
	"gain_loss" numeric NOT NULL,
	"approved_by_uid" text,
	"status" text DEFAULT 'Pending' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "asset_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"branch_id" integer,
	"parent_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'Active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "asset_maintenance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"maintenance_type" text NOT NULL,
	"vendor_id" integer,
	"cost" numeric DEFAULT '0.00' NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"completed_date" timestamp,
	"next_due_date" timestamp,
	"notes" text,
	"status" text DEFAULT 'Scheduled' NOT NULL,
	"recurrence_interval" text DEFAULT 'None',
	"parent_task_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "asset_physical_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"verification_code" text NOT NULL,
	"branch_id" integer,
	"status" text DEFAULT 'In-Progress' NOT NULL,
	"verification_date" timestamp DEFAULT now() NOT NULL,
	"verified_by_uid" text,
	"total_assets_counted" integer DEFAULT 0,
	"total_missing" integer DEFAULT 0,
	"total_misplaced" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "asset_physical_verifications_verification_code_unique" UNIQUE("verification_code")
);
--> statement-breakpoint
CREATE TABLE "asset_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"from_branch_id" integer,
	"from_custodian_uid" text,
	"to_branch_id" integer,
	"to_custodian_uid" text,
	"reason" text NOT NULL,
	"status" text DEFAULT 'Pending' NOT NULL,
	"requested_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "asset_verification_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verification_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"expected_branch_id" integer,
	"found_branch_id" integer,
	"expected_custodian_uid" text,
	"found_custodian_uid" text,
	"condition" text DEFAULT 'Good' NOT NULL,
	"verification_status" text DEFAULT 'Unverified' NOT NULL,
	"scanned_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"asset_code" text NOT NULL,
	"name" text NOT NULL,
	"category_id" uuid NOT NULL,
	"branch_id" integer,
	"location_id" uuid,
	"brand_id" uuid,
	"model_id" uuid,
	"specification_id" uuid,
	"size_value" text,
	"uom_id" integer,
	"warehouse_id" integer,
	"custodian_uid" text,
	"department_id" integer,
	"acquisition_date" timestamp NOT NULL,
	"acquisition_cost" numeric NOT NULL,
	"salvage_value" numeric DEFAULT '0.00' NOT NULL,
	"depreciation_method" text DEFAULT 'Straight Line' NOT NULL,
	"declining_rate" numeric DEFAULT '0.00',
	"useful_life_months" integer DEFAULT 36 NOT NULL,
	"depreciation_start_date" timestamp,
	"accumulated_depreciation" numeric DEFAULT '0.00' NOT NULL,
	"current_book_value" numeric NOT NULL,
	"status" text DEFAULT 'Draft' NOT NULL,
	"source_type" text DEFAULT 'Manual' NOT NULL,
	"source_grn_id" integer,
	"serial_number" text,
	"qr_code" text,
	"warranty_expiry_date" timestamp,
	"next_maintenance_due" timestamp,
	"created_by_uid" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "assets_asset_code_unique" UNIQUE("asset_code")
);
--> statement-breakpoint
CREATE TABLE "physical_count_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"count_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"warehouse_stock_id" integer,
	"system_qty" integer NOT NULL,
	"physical_qty" integer,
	"variance_qty" integer,
	"variance_value" numeric,
	"variance_reason" text,
	"adjusted" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "physical_stock_counts" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" uuid,
	"warehouse_id" integer NOT NULL,
	"count_number" text NOT NULL,
	"count_type" text DEFAULT 'Spot-Check',
	"status" text DEFAULT 'Pending',
	"scheduled_date" timestamp NOT NULL,
	"actual_start_date" timestamp,
	"completed_date" timestamp,
	"counting_team" text,
	"total_items_counted" integer DEFAULT 0,
	"total_variances" integer DEFAULT 0,
	"total_variance_value" numeric DEFAULT '0',
	"notes" text,
	"approved_by_uid" text,
	"approved_at" timestamp,
	"created_by_uid" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "physical_stock_counts_count_number_unique" UNIQUE("count_number")
);
--> statement-breakpoint
CREATE TABLE "profile_change_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" uuid,
	"user_id" integer,
	"requested_data" jsonb NOT NULL,
	"status" text DEFAULT 'Pending',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rejected_item_dispositions" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" uuid,
	"qc_inspection_id" integer NOT NULL,
	"grn_id" integer NOT NULL,
	"grn_item_id" integer NOT NULL,
	"item_id" integer,
	"item_name" text NOT NULL,
	"quantity_rejected" integer NOT NULL,
	"disposition_type" text,
	"status" text DEFAULT 'Pending',
	"vendor_credit_note_number" text,
	"notes" text,
	"disposed_by_uid" text,
	"disposed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_adjustments" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" uuid,
	"count_id" integer,
	"item_id" integer NOT NULL,
	"warehouse_id" integer NOT NULL,
	"adjustment_qty" integer NOT NULL,
	"reason" text NOT NULL,
	"adjusted_from_qty" integer NOT NULL,
	"adjusted_to_qty" integer NOT NULL,
	"adjusted_by_uid" text NOT NULL,
	"approved_by_uid" text,
	"status" text DEFAULT 'Pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_consumption_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" uuid,
	"warehouse_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"consumption_date" text NOT NULL,
	"consumed_qty" integer NOT NULL,
	"reference_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" uuid,
	"warehouse_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"stock_out_request_id" integer NOT NULL,
	"reserved_qty" integer NOT NULL,
	"reservation_date" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"status" text DEFAULT 'Active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vendor_quality_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" uuid,
	"vendor_id" integer NOT NULL,
	"evaluation_month" text NOT NULL,
	"total_grn_count" integer DEFAULT 0,
	"total_items_received" integer DEFAULT 0,
	"total_items_rejected" integer DEFAULT 0,
	"rejection_rate" numeric DEFAULT '0',
	"cost_of_rejections" numeric DEFAULT '0',
	"defect_categories" jsonb,
	"quality_score" numeric DEFAULT '10',
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "work_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" uuid,
	"wo_number" text NOT NULL,
	"cs_id" integer,
	"po_id" integer,
	"pr_id" integer,
	"vendor_id" integer NOT NULL,
	"subject" text,
	"attn_person" text,
	"quotation_ref_no" text,
	"quotation_date" timestamp,
	"delivery_address" text,
	"office_contact_name" text,
	"office_contact_phone" text,
	"office_contact_email" text,
	"total_amount" numeric,
	"vat_amount" numeric,
	"tax_amount" numeric,
	"grand_total" numeric,
	"terms_conditions" jsonb,
	"signed_file_url" text,
	"signed_uploaded_at" timestamp,
	"signed_uploaded_by" text,
	"status" text DEFAULT 'Pending Signed Upload',
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "work_orders_wo_number_unique" UNIQUE("wo_number")
);
--> statement-breakpoint
ALTER TABLE "grn_items" ADD COLUMN "batch_number" text;--> statement-breakpoint
ALTER TABLE "grn_items" ADD COLUMN "expiry_date" timestamp;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "reserved_quantity" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "reorder_point" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "reorder_quantity" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "lead_time_days" integer DEFAULT 7;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "safety_stock_days" integer DEFAULT 3;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "abc_classification" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "avg_daily_consumption" numeric;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "asset_category_id" uuid;--> statement-breakpoint
ALTER TABLE "qc_inspections" ADD COLUMN "defect_category" text;--> statement-breakpoint
ALTER TABLE "qc_inspections" ADD COLUMN "defect_description" text;--> statement-breakpoint
ALTER TABLE "qc_inspections" ADD COLUMN "cost_of_defect" numeric;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "attachment_url" text;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "vat_percent" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "vat_amount" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "tax_percent" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "tax_amount" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "total_amount" numeric;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD COLUMN "dispatch_date" timestamp;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD COLUMN "expected_arrival_date" timestamp;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD COLUMN "actual_arrival_date" timestamp;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "bank_name" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "branch_name" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "account_name" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "account_number" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "routing_number" text;--> statement-breakpoint
ALTER TABLE "warehouse_stock" ADD COLUMN "reserved_quantity" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "warehouse_stock" ADD COLUMN "batch_number" text;--> statement-breakpoint
ALTER TABLE "warehouse_stock" ADD COLUMN "expiry_date" timestamp;--> statement-breakpoint
ALTER TABLE "asset_attributes" ADD CONSTRAINT "asset_attributes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_attributes" ADD CONSTRAINT "asset_attributes_category_id_asset_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."asset_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_categories" ADD CONSTRAINT "asset_categories_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_depreciation_schedule" ADD CONSTRAINT "asset_depreciation_schedule_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_depreciation_schedule" ADD CONSTRAINT "asset_depreciation_schedule_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_disposals" ADD CONSTRAINT "asset_disposals_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_disposals" ADD CONSTRAINT "asset_disposals_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_disposals" ADD CONSTRAINT "asset_disposals_approved_by_uid_users_uid_fk" FOREIGN KEY ("approved_by_uid") REFERENCES "public"."users"("uid") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "asset_locations" ADD CONSTRAINT "asset_locations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_locations" ADD CONSTRAINT "asset_locations_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_maintenance" ADD CONSTRAINT "asset_maintenance_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_maintenance" ADD CONSTRAINT "asset_maintenance_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_maintenance" ADD CONSTRAINT "asset_maintenance_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_maintenance" ADD CONSTRAINT "asset_maintenance_parent_task_id_asset_maintenance_id_fk" FOREIGN KEY ("parent_task_id") REFERENCES "public"."asset_maintenance"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_physical_verifications" ADD CONSTRAINT "asset_physical_verifications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_physical_verifications" ADD CONSTRAINT "asset_physical_verifications_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_physical_verifications" ADD CONSTRAINT "asset_physical_verifications_verified_by_uid_users_uid_fk" FOREIGN KEY ("verified_by_uid") REFERENCES "public"."users"("uid") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_from_branch_id_branches_id_fk" FOREIGN KEY ("from_branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_from_custodian_uid_users_uid_fk" FOREIGN KEY ("from_custodian_uid") REFERENCES "public"."users"("uid") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_to_branch_id_branches_id_fk" FOREIGN KEY ("to_branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_to_custodian_uid_users_uid_fk" FOREIGN KEY ("to_custodian_uid") REFERENCES "public"."users"("uid") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_requested_by_users_uid_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("uid") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "asset_verification_details" ADD CONSTRAINT "asset_verification_details_verification_id_asset_physical_verifications_id_fk" FOREIGN KEY ("verification_id") REFERENCES "public"."asset_physical_verifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_verification_details" ADD CONSTRAINT "asset_verification_details_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_verification_details" ADD CONSTRAINT "asset_verification_details_expected_branch_id_branches_id_fk" FOREIGN KEY ("expected_branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_verification_details" ADD CONSTRAINT "asset_verification_details_found_branch_id_branches_id_fk" FOREIGN KEY ("found_branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_verification_details" ADD CONSTRAINT "asset_verification_details_expected_custodian_uid_users_uid_fk" FOREIGN KEY ("expected_custodian_uid") REFERENCES "public"."users"("uid") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "asset_verification_details" ADD CONSTRAINT "asset_verification_details_found_custodian_uid_users_uid_fk" FOREIGN KEY ("found_custodian_uid") REFERENCES "public"."users"("uid") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_category_id_asset_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."asset_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_location_id_asset_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."asset_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_brand_id_asset_attributes_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."asset_attributes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_model_id_asset_attributes_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."asset_attributes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_specification_id_asset_attributes_id_fk" FOREIGN KEY ("specification_id") REFERENCES "public"."asset_attributes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_uom_id_units_id_fk" FOREIGN KEY ("uom_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_custodian_uid_users_uid_fk" FOREIGN KEY ("custodian_uid") REFERENCES "public"."users"("uid") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_source_grn_id_grn_id_fk" FOREIGN KEY ("source_grn_id") REFERENCES "public"."grn"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_created_by_uid_users_uid_fk" FOREIGN KEY ("created_by_uid") REFERENCES "public"."users"("uid") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "physical_count_details" ADD CONSTRAINT "physical_count_details_count_id_physical_stock_counts_id_fk" FOREIGN KEY ("count_id") REFERENCES "public"."physical_stock_counts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_count_details" ADD CONSTRAINT "physical_count_details_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_count_details" ADD CONSTRAINT "physical_count_details_warehouse_stock_id_warehouse_stock_id_fk" FOREIGN KEY ("warehouse_stock_id") REFERENCES "public"."warehouse_stock"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_stock_counts" ADD CONSTRAINT "physical_stock_counts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_stock_counts" ADD CONSTRAINT "physical_stock_counts_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_stock_counts" ADD CONSTRAINT "physical_stock_counts_approved_by_uid_users_uid_fk" FOREIGN KEY ("approved_by_uid") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_stock_counts" ADD CONSTRAINT "physical_stock_counts_created_by_uid_users_uid_fk" FOREIGN KEY ("created_by_uid") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_change_requests" ADD CONSTRAINT "profile_change_requests_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_change_requests" ADD CONSTRAINT "profile_change_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rejected_item_dispositions" ADD CONSTRAINT "rejected_item_dispositions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rejected_item_dispositions" ADD CONSTRAINT "rejected_item_dispositions_qc_inspection_id_qc_inspections_id_fk" FOREIGN KEY ("qc_inspection_id") REFERENCES "public"."qc_inspections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rejected_item_dispositions" ADD CONSTRAINT "rejected_item_dispositions_grn_id_grn_id_fk" FOREIGN KEY ("grn_id") REFERENCES "public"."grn"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rejected_item_dispositions" ADD CONSTRAINT "rejected_item_dispositions_grn_item_id_grn_items_id_fk" FOREIGN KEY ("grn_item_id") REFERENCES "public"."grn_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rejected_item_dispositions" ADD CONSTRAINT "rejected_item_dispositions_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rejected_item_dispositions" ADD CONSTRAINT "rejected_item_dispositions_disposed_by_uid_users_uid_fk" FOREIGN KEY ("disposed_by_uid") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_count_id_physical_stock_counts_id_fk" FOREIGN KEY ("count_id") REFERENCES "public"."physical_stock_counts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_adjusted_by_uid_users_uid_fk" FOREIGN KEY ("adjusted_by_uid") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_approved_by_uid_users_uid_fk" FOREIGN KEY ("approved_by_uid") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_consumption_history" ADD CONSTRAINT "stock_consumption_history_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_consumption_history" ADD CONSTRAINT "stock_consumption_history_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_consumption_history" ADD CONSTRAINT "stock_consumption_history_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_stock_out_request_id_stock_out_requests_id_fk" FOREIGN KEY ("stock_out_request_id") REFERENCES "public"."stock_out_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_quality_metrics" ADD CONSTRAINT "vendor_quality_metrics_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_quality_metrics" ADD CONSTRAINT "vendor_quality_metrics_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_cs_id_comparative_statements_id_fk" FOREIGN KEY ("cs_id") REFERENCES "public"."comparative_statements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_pr_id_purchase_requisitions_id_fk" FOREIGN KEY ("pr_id") REFERENCES "public"."purchase_requisitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_signed_uploaded_by_users_uid_fk" FOREIGN KEY ("signed_uploaded_by") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_created_by_users_uid_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_month_unq_idx" ON "vendor_quality_metrics" USING btree ("vendor_id","evaluation_month");--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_asset_category_id_asset_categories_id_fk" FOREIGN KEY ("asset_category_id") REFERENCES "public"."asset_categories"("id") ON DELETE no action ON UPDATE no action;