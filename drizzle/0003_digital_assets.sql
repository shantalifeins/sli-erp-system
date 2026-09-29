CREATE TABLE "digital_asset_amortization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"digital_asset_id" uuid NOT NULL,
	"period_number" integer NOT NULL,
	"period_date" timestamp NOT NULL,
	"amortization_amount" numeric NOT NULL,
	"accumulated_amortization" numeric NOT NULL,
	"book_value_after" numeric NOT NULL,
	"status" text DEFAULT 'Scheduled' NOT NULL,
	"posted_at" timestamp,
	"posted_by_uid" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "digital_asset_renewals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"digital_asset_id" uuid NOT NULL,
	"renewal_date" timestamp NOT NULL,
	"amount" numeric NOT NULL,
	"currency" text DEFAULT 'BDT',
	"invoice_id" integer,
	"payment_id" integer,
	"new_expiry_date" timestamp NOT NULL,
	"renewed_by_uid" text,
	"notes" text,
	"status" text DEFAULT 'Scheduled' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "digital_asset_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"digital_asset_id" uuid NOT NULL,
	"assigned_uid" text NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"revoked_at" timestamp,
	"status" text DEFAULT 'Active' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "digital_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"asset_code" text NOT NULL,
	"name" text NOT NULL,
	"asset_type" text NOT NULL,
	"vendor_id" integer,
	"inventory_item_id" integer,
	"source_grn_id" integer,
	"source_po_id" integer,
	"custodian_uid" text,
	"department_id" integer,
	"branch_id" integer,
	"license_type" text,
	"total_seats" integer DEFAULT 1,
	"used_seats" integer DEFAULT 0,
	"billing_cycle" text DEFAULT 'One-Time',
	"acquisition_cost" numeric DEFAULT '0.00',
	"recurring_cost" numeric DEFAULT '0.00',
	"currency" text DEFAULT 'BDT',
	"activation_date" timestamp,
	"expiry_date" timestamp,
	"auto_renewal" boolean DEFAULT false,
	"renewal_reminder_days" integer DEFAULT 30,
	"portal_url" text,
	"login_email" text,
	"license_key_encrypted" text,
	"api_key_encrypted" text,
	"notes" text,
	"amortization_months" integer,
	"amortization_gl_account" text,
	"prepaid_gl_account" text,
	"status" text DEFAULT 'Draft' NOT NULL,
	"created_by_uid" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "digital_assets_asset_code_unique" UNIQUE("asset_code")
);

ALTER TABLE "inventory_items" ADD COLUMN "is_digital_asset" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "requires_qc" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "digital_asset_amortization" ADD CONSTRAINT "digital_asset_amortization_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_asset_amortization" ADD CONSTRAINT "digital_asset_amortization_digital_asset_id_digital_assets_id_fk" FOREIGN KEY ("digital_asset_id") REFERENCES "public"."digital_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_asset_amortization" ADD CONSTRAINT "digital_asset_amortization_posted_by_uid_users_uid_fk" FOREIGN KEY ("posted_by_uid") REFERENCES "public"."users"("uid") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "digital_asset_renewals" ADD CONSTRAINT "digital_asset_renewals_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_asset_renewals" ADD CONSTRAINT "digital_asset_renewals_digital_asset_id_digital_assets_id_fk" FOREIGN KEY ("digital_asset_id") REFERENCES "public"."digital_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_asset_renewals" ADD CONSTRAINT "digital_asset_renewals_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_asset_renewals" ADD CONSTRAINT "digital_asset_renewals_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_asset_renewals" ADD CONSTRAINT "digital_asset_renewals_renewed_by_uid_users_uid_fk" FOREIGN KEY ("renewed_by_uid") REFERENCES "public"."users"("uid") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "digital_asset_users" ADD CONSTRAINT "digital_asset_users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_asset_users" ADD CONSTRAINT "digital_asset_users_digital_asset_id_digital_assets_id_fk" FOREIGN KEY ("digital_asset_id") REFERENCES "public"."digital_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_asset_users" ADD CONSTRAINT "digital_asset_users_assigned_uid_users_uid_fk" FOREIGN KEY ("assigned_uid") REFERENCES "public"."users"("uid") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD CONSTRAINT "digital_assets_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD CONSTRAINT "digital_assets_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD CONSTRAINT "digital_assets_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD CONSTRAINT "digital_assets_source_grn_id_grn_id_fk" FOREIGN KEY ("source_grn_id") REFERENCES "public"."grn"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD CONSTRAINT "digital_assets_source_po_id_purchase_orders_id_fk" FOREIGN KEY ("source_po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD CONSTRAINT "digital_assets_custodian_uid_users_uid_fk" FOREIGN KEY ("custodian_uid") REFERENCES "public"."users"("uid") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD CONSTRAINT "digital_assets_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD CONSTRAINT "digital_assets_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD CONSTRAINT "digital_assets_created_by_uid_users_uid_fk" FOREIGN KEY ("created_by_uid") REFERENCES "public"."users"("uid") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint