CREATE TABLE "accounting_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"event_type" text NOT NULL,
	"source_type" text,
	"source_id" text,
	"debit_account" text,
	"credit_account" text,
	"amount" numeric,
	"status" text DEFAULT 'Pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "digital_acceptances" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" uuid,
	"grn_id" integer,
	"po_item_id" integer,
	"accepted_by_uid" text,
	"accepted_at" timestamp DEFAULT now(),
	"license_type" text,
	"seats" integer DEFAULT 1,
	"start_date" timestamp,
	"end_date" timestamp,
	"agreement_ref" text,
	"entitlement_ref" text,
	"status" text DEFAULT 'Pending'
);
--> statement-breakpoint
CREATE TABLE "document_sequences" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" uuid,
	"doc_type" text NOT NULL,
	"year" integer NOT NULL,
	"last_no" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "grn_item_serials" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" uuid,
	"grn_item_id" integer NOT NULL,
	"serial_number" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"po_item_id" integer,
	"grn_item_id" integer,
	"item_id" integer,
	"description" text,
	"quantity" numeric NOT NULL,
	"unit_price" numeric NOT NULL,
	"tax_amount" numeric DEFAULT '0',
	"cost_type" text DEFAULT 'Base',
	"capitalizable" boolean DEFAULT true
);
--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "grn_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "po_id" integer;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "po_item_id" integer;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "invoice_id" integer;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "invoice_item_id" integer;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "cost_status" text DEFAULT 'Provisional';--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "is_capitalized" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "put_to_use_date" timestamp;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "capitalization_date" timestamp;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "source_grn_item_id" integer;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "unit_index" integer;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD COLUMN "accounting_treatment" text DEFAULT 'Prepaid';--> statement-breakpoint
ALTER TABLE "digital_assets" ADD COLUMN "po_item_id" integer;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD COLUMN "invoice_id" integer;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD COLUMN "acceptance_id" integer;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD COLUMN "agreement_ref" text;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD COLUMN "entitlement_ref" text;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD COLUMN "cost_status" text DEFAULT 'Provisional';--> statement-breakpoint
ALTER TABLE "digital_assets" ADD COLUMN "put_to_use_date" timestamp;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD COLUMN "service_start_date" timestamp;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD COLUMN "service_end_date" timestamp;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD COLUMN "license_key_iv" text;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD COLUMN "license_key_tag" text;--> statement-breakpoint
ALTER TABLE "grn_items" ADD COLUMN "condition" text;--> statement-breakpoint
ALTER TABLE "grn_items" ADD COLUMN "remarks" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "asset_nature" text DEFAULT 'Physical';--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "usage_purpose" text DEFAULT 'Internal Use';--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "accounting_treatment" text DEFAULT 'Inventory';--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "tracking_required" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "tracking_method" text DEFAULT 'None';--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "receipt_mode" text DEFAULT 'Physical Receipt';--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "item_category_id" integer;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "capitalization_threshold" numeric;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "useful_life_months" integer;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "depreciation_method" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "salvage_percent" numeric;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "digital_asset_type" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "default_license_type" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "default_billing_cycle" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "default_amortization_months" integer;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "default_cost_center_id" integer;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "status" text DEFAULT 'Active';--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "barcode" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "vendor_id" integer;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "vendor_invoice_no" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "invoice_type" text DEFAULT 'Goods';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "subtotal" numeric;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "tax_amount" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "discount_amount" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "freight_amount" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "due_date" timestamp;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "match_status" text DEFAULT 'Matched';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "approval_status" text DEFAULT 'Pending';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "po_items" ADD COLUMN "item_id" integer;--> statement-breakpoint
ALTER TABLE "po_items" ADD COLUMN "pr_item_id" integer;--> statement-breakpoint
ALTER TABLE "po_items" ADD COLUMN "line_no" integer;--> statement-breakpoint
ALTER TABLE "po_items" ADD COLUMN "received_quantity" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "po_items" ADD COLUMN "invoiced_quantity" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "po_items" ADD COLUMN "tax_rate" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "po_items" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "accounting_events" ADD CONSTRAINT "accounting_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_acceptances" ADD CONSTRAINT "digital_acceptances_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_acceptances" ADD CONSTRAINT "digital_acceptances_grn_id_grn_id_fk" FOREIGN KEY ("grn_id") REFERENCES "public"."grn"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_acceptances" ADD CONSTRAINT "digital_acceptances_po_item_id_po_items_id_fk" FOREIGN KEY ("po_item_id") REFERENCES "public"."po_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_acceptances" ADD CONSTRAINT "digital_acceptances_accepted_by_uid_users_uid_fk" FOREIGN KEY ("accepted_by_uid") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "document_sequences" ADD CONSTRAINT "document_sequences_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grn_item_serials" ADD CONSTRAINT "grn_item_serials_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grn_item_serials" ADD CONSTRAINT "grn_item_serials_grn_item_id_grn_items_id_fk" FOREIGN KEY ("grn_item_id") REFERENCES "public"."grn_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_po_item_id_po_items_id_fk" FOREIGN KEY ("po_item_id") REFERENCES "public"."po_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_grn_item_id_grn_items_id_fk" FOREIGN KEY ("grn_item_id") REFERENCES "public"."grn_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "doc_seq_unq" ON "document_sequences" USING btree ("company_id","doc_type","year");--> statement-breakpoint
CREATE UNIQUE INDEX "grn_serials_unq" ON "grn_item_serials" USING btree ("company_id","serial_number");--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_po_item_id_po_items_id_fk" FOREIGN KEY ("po_item_id") REFERENCES "public"."po_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_invoice_item_id_invoice_items_id_fk" FOREIGN KEY ("invoice_item_id") REFERENCES "public"."invoice_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_source_grn_item_id_grn_items_id_fk" FOREIGN KEY ("source_grn_item_id") REFERENCES "public"."grn_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD CONSTRAINT "digital_assets_po_item_id_po_items_id_fk" FOREIGN KEY ("po_item_id") REFERENCES "public"."po_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD CONSTRAINT "digital_assets_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD CONSTRAINT "digital_assets_acceptance_id_digital_acceptances_id_fk" FOREIGN KEY ("acceptance_id") REFERENCES "public"."digital_acceptances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_item_category_id_item_categories_id_fk" FOREIGN KEY ("item_category_id") REFERENCES "public"."item_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_default_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("default_cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_created_by_users_uid_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_updated_by_users_uid_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_users_uid_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "po_items" ADD CONSTRAINT "po_items_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_items" ADD CONSTRAINT "po_items_pr_item_id_pr_items_id_fk" FOREIGN KEY ("pr_item_id") REFERENCES "public"."pr_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assets_grn_item_unit_unq" ON "assets" USING btree ("source_grn_item_id","unit_index");--> statement-breakpoint
CREATE UNIQUE INDEX "inv_items_company_code_unq" ON "inventory_items" USING btree ("company_id","item_code");