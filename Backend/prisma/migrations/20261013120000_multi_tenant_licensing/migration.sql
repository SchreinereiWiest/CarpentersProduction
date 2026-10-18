-- Introduce a deterministic development tenant so existing installations can
-- migrate without manual data surgery. Change its name/slug after deployment.
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");
CREATE UNIQUE INDEX "tenants_name_ci_key" ON "tenants"(lower("name"));
CREATE INDEX "tenants_name_idx" ON "tenants"("name");

INSERT INTO "tenants" ("id", "name", "slug")
VALUES ('00000000-0000-4000-8000-000000000001', 'Development Company', 'development');

CREATE TABLE "tenant_memberships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenant_memberships_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tenant_memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tenant_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "tenant_memberships_tenant_id_user_id_key" ON "tenant_memberships"("tenant_id", "user_id");
CREATE INDEX "tenant_memberships_user_id_idx" ON "tenant_memberships"("user_id");

INSERT INTO "tenant_memberships" ("tenant_id", "user_id", "role")
SELECT '00000000-0000-4000-8000-000000000001', "id", "role" FROM "users";

CREATE TABLE "tenant_licenses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "license_id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "features" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "max_users" INTEGER,
    "valid_until" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "license_key_hash" TEXT,
    "certificate" TEXT,
    "last_checked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenant_licenses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tenant_licenses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "tenant_licenses_tenant_id_key" ON "tenant_licenses"("tenant_id");
CREATE UNIQUE INDEX "tenant_licenses_license_id_key" ON "tenant_licenses"("license_id");

INSERT INTO "tenant_licenses" ("tenant_id", "license_id", "company_name", "plan", "features", "status")
VALUES (
    '00000000-0000-4000-8000-000000000001',
    'development-license',
    'Development Company',
    'development',
    ARRAY['crm', 'cabinet', 'nesting', 'management', 'storage', 'time', 'purchasing'],
    'active'
);

-- Add and backfill tenant ownership on every business-data table.
ALTER TABLE "audit_logs" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "storage_deletion_jobs" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "customers" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "customer_addresses" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "projects" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "communications" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "appointments" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "s3_objects" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "files" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "project_storage" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "materials" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "suppliers" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "shop_article_groups" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "shop_articles" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "shop_hardware_mappings" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "time_entries" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "management_periods" ADD COLUMN "id" UUID DEFAULT gen_random_uuid();
ALTER TABLE "management_periods" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "management_transactions" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "management_payments" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "management_assets" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "management_loans" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "management_repayments" ADD COLUMN "tenant_id" UUID;

UPDATE "audit_logs" SET "tenant_id" = '00000000-0000-4000-8000-000000000001';
UPDATE "storage_deletion_jobs" SET "tenant_id" = '00000000-0000-4000-8000-000000000001';
UPDATE "customers" SET "tenant_id" = '00000000-0000-4000-8000-000000000001';
UPDATE "customer_addresses" SET "tenant_id" = '00000000-0000-4000-8000-000000000001';
UPDATE "projects" SET "tenant_id" = '00000000-0000-4000-8000-000000000001';
UPDATE "communications" SET "tenant_id" = '00000000-0000-4000-8000-000000000001';
UPDATE "appointments" SET "tenant_id" = '00000000-0000-4000-8000-000000000001';
UPDATE "s3_objects" SET "tenant_id" = '00000000-0000-4000-8000-000000000001';
UPDATE "files" SET "tenant_id" = '00000000-0000-4000-8000-000000000001';
UPDATE "project_storage" SET "tenant_id" = '00000000-0000-4000-8000-000000000001';
UPDATE "materials" SET "tenant_id" = '00000000-0000-4000-8000-000000000001';
UPDATE "suppliers" SET "tenant_id" = '00000000-0000-4000-8000-000000000001';
UPDATE "shop_article_groups" SET "tenant_id" = '00000000-0000-4000-8000-000000000001';
UPDATE "shop_articles" SET "tenant_id" = '00000000-0000-4000-8000-000000000001';
UPDATE "shop_hardware_mappings" SET "tenant_id" = '00000000-0000-4000-8000-000000000001';
UPDATE "time_entries" SET "tenant_id" = '00000000-0000-4000-8000-000000000001';
UPDATE "management_periods" SET "tenant_id" = '00000000-0000-4000-8000-000000000001';
UPDATE "management_transactions" SET "tenant_id" = '00000000-0000-4000-8000-000000000001';
UPDATE "management_payments" SET "tenant_id" = '00000000-0000-4000-8000-000000000001';
UPDATE "management_assets" SET "tenant_id" = '00000000-0000-4000-8000-000000000001';
UPDATE "management_loans" SET "tenant_id" = '00000000-0000-4000-8000-000000000001';
UPDATE "management_repayments" SET "tenant_id" = '00000000-0000-4000-8000-000000000001';

ALTER TABLE "audit_logs" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "storage_deletion_jobs" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "customers" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "customer_addresses" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "projects" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "communications" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "appointments" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "s3_objects" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "files" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "project_storage" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "materials" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "suppliers" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "shop_article_groups" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "shop_articles" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "shop_hardware_mappings" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "time_entries" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "management_periods" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "management_periods" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "management_transactions" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "management_payments" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "management_assets" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "management_loans" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "management_repayments" ALTER COLUMN "tenant_id" SET NOT NULL;

-- Replace global business keys with tenant-local keys.
DROP INDEX "customers_customer_number_key";
DROP INDEX "projects_project_number_key";
DROP INDEX "storage_deletion_jobs_bucket_name_object_key_key";
DROP INDEX "shop_hardware_mappings_variant_color_key";
DROP INDEX "management_transactions_source_key_key";
ALTER TABLE "management_periods" DROP CONSTRAINT "management_periods_pkey";
ALTER TABLE "management_periods" ADD CONSTRAINT "management_periods_pkey" PRIMARY KEY ("id");

CREATE UNIQUE INDEX "customers_tenant_id_customer_number_key" ON "customers"("tenant_id", "customer_number");
CREATE UNIQUE INDEX "projects_tenant_id_project_number_key" ON "projects"("tenant_id", "project_number");
CREATE UNIQUE INDEX "storage_deletion_jobs_tenant_id_bucket_name_object_key_key" ON "storage_deletion_jobs"("tenant_id", "bucket_name", "object_key");
CREATE UNIQUE INDEX "shop_hardware_mappings_tenant_id_variant_color_key" ON "shop_hardware_mappings"("tenant_id", "variant", "color");
CREATE UNIQUE INDEX "management_periods_tenant_id_year_key" ON "management_periods"("tenant_id", "year");
CREATE UNIQUE INDEX "management_transactions_tenant_id_source_key_key" ON "management_transactions"("tenant_id", "source_key");

-- Composite identity indexes are the targets for tenant-consistent FKs.
CREATE UNIQUE INDEX "audit_logs_tenant_id_id_key" ON "audit_logs"("tenant_id", "id");
CREATE UNIQUE INDEX "storage_deletion_jobs_tenant_id_id_key" ON "storage_deletion_jobs"("tenant_id", "id");
CREATE UNIQUE INDEX "customers_tenant_id_id_key" ON "customers"("tenant_id", "id");
CREATE UNIQUE INDEX "customer_addresses_tenant_id_id_key" ON "customer_addresses"("tenant_id", "id");
CREATE UNIQUE INDEX "projects_tenant_id_id_key" ON "projects"("tenant_id", "id");
CREATE UNIQUE INDEX "communications_tenant_id_id_key" ON "communications"("tenant_id", "id");
CREATE UNIQUE INDEX "appointments_tenant_id_id_key" ON "appointments"("tenant_id", "id");
CREATE UNIQUE INDEX "s3_objects_tenant_id_id_key" ON "s3_objects"("tenant_id", "id");
CREATE UNIQUE INDEX "files_tenant_id_id_key" ON "files"("tenant_id", "id");
CREATE UNIQUE INDEX "project_storage_tenant_id_id_key" ON "project_storage"("tenant_id", "id");
CREATE UNIQUE INDEX "materials_tenant_id_id_key" ON "materials"("tenant_id", "id");
CREATE UNIQUE INDEX "suppliers_tenant_id_id_key" ON "suppliers"("tenant_id", "id");
CREATE UNIQUE INDEX "shop_article_groups_tenant_id_id_key" ON "shop_article_groups"("tenant_id", "id");
CREATE UNIQUE INDEX "shop_articles_tenant_id_id_key" ON "shop_articles"("tenant_id", "id");
CREATE UNIQUE INDEX "shop_hardware_mappings_tenant_id_id_key" ON "shop_hardware_mappings"("tenant_id", "id");
CREATE UNIQUE INDEX "time_entries_tenant_id_id_key" ON "time_entries"("tenant_id", "id");
CREATE UNIQUE INDEX "management_periods_tenant_id_id_key" ON "management_periods"("tenant_id", "id");
CREATE UNIQUE INDEX "management_transactions_tenant_id_id_key" ON "management_transactions"("tenant_id", "id");
CREATE UNIQUE INDEX "management_payments_tenant_id_id_key" ON "management_payments"("tenant_id", "id");
CREATE UNIQUE INDEX "management_assets_tenant_id_id_key" ON "management_assets"("tenant_id", "id");
CREATE UNIQUE INDEX "management_loans_tenant_id_id_key" ON "management_loans"("tenant_id", "id");
CREATE UNIQUE INDEX "management_repayments_tenant_id_id_key" ON "management_repayments"("tenant_id", "id");

-- Every tenant-owned row references a real tenant.
DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'audit_logs','storage_deletion_jobs','customers','customer_addresses','projects',
    'communications','appointments','s3_objects','files','project_storage','materials',
    'suppliers','shop_article_groups','shop_articles','shop_hardware_mappings','time_entries',
    'management_periods','management_transactions','management_payments','management_assets',
    'management_loans','management_repayments'
  ] LOOP
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE',
      table_name, table_name || '_tenant_id_fkey'
    );
  END LOOP;
END $$;

-- Add tenant-consistent composite FKs alongside Prisma's ordinary relation FKs.
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_tenant_customer_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "customers"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenant_customer_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "customers"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "communications" ADD CONSTRAINT "communications_tenant_customer_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "customers"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "communications" ADD CONSTRAINT "communications_tenant_project_fkey" FOREIGN KEY ("tenant_id", "project_id") REFERENCES "projects"("tenant_id", "id") ON DELETE SET NULL ("project_id") ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenant_customer_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "customers"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenant_project_fkey" FOREIGN KEY ("tenant_id", "project_id") REFERENCES "projects"("tenant_id", "id") ON DELETE SET NULL ("project_id") ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenant_address_fkey" FOREIGN KEY ("tenant_id", "address_id") REFERENCES "customer_addresses"("tenant_id", "id") ON DELETE SET NULL ("address_id") ON UPDATE CASCADE;
ALTER TABLE "files" ADD CONSTRAINT "files_tenant_customer_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "customers"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "files" ADD CONSTRAINT "files_tenant_project_fkey" FOREIGN KEY ("tenant_id", "project_id") REFERENCES "projects"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "files" ADD CONSTRAINT "files_tenant_storage_object_fkey" FOREIGN KEY ("tenant_id", "storage_object_id") REFERENCES "s3_objects"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_storage" ADD CONSTRAINT "project_storage_tenant_project_fkey" FOREIGN KEY ("tenant_id", "project_id") REFERENCES "projects"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_storage" ADD CONSTRAINT "project_storage_tenant_object_fkey" FOREIGN KEY ("tenant_id", "storage_object_id") REFERENCES "s3_objects"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "materials" ADD CONSTRAINT "materials_tenant_supplier_fkey" FOREIGN KEY ("tenant_id", "supplier_id") REFERENCES "suppliers"("tenant_id", "id") ON DELETE SET NULL ("supplier_id") ON UPDATE CASCADE;
ALTER TABLE "shop_articles" ADD CONSTRAINT "shop_articles_tenant_supplier_fkey" FOREIGN KEY ("tenant_id", "supplier_id") REFERENCES "suppliers"("tenant_id", "id") ON DELETE SET NULL ("supplier_id") ON UPDATE CASCADE;
ALTER TABLE "shop_articles" ADD CONSTRAINT "shop_articles_tenant_group_fkey" FOREIGN KEY ("tenant_id", "group_id") REFERENCES "shop_article_groups"("tenant_id", "id") ON DELETE SET NULL ("group_id") ON UPDATE CASCADE;
ALTER TABLE "shop_articles" ADD CONSTRAINT "shop_articles_tenant_image_file_fkey" FOREIGN KEY ("tenant_id", "image_file_id") REFERENCES "files"("tenant_id", "id") ON DELETE SET NULL ("image_file_id") ON UPDATE CASCADE;
ALTER TABLE "shop_hardware_mappings" ADD CONSTRAINT "shop_hardware_mappings_tenant_article_fkey" FOREIGN KEY ("tenant_id", "article_id") REFERENCES "shop_articles"("tenant_id", "id") ON DELETE SET NULL ("article_id") ON UPDATE CASCADE;
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_tenant_project_fkey" FOREIGN KEY ("tenant_id", "project_id") REFERENCES "projects"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "management_transactions" ADD CONSTRAINT "management_transactions_tenant_project_fkey" FOREIGN KEY ("tenant_id", "project_id") REFERENCES "projects"("tenant_id", "id") ON DELETE SET NULL ("project_id") ON UPDATE CASCADE;
ALTER TABLE "management_transactions" ADD CONSTRAINT "management_transactions_tenant_file_fkey" FOREIGN KEY ("tenant_id", "file_id") REFERENCES "files"("tenant_id", "id") ON DELETE SET NULL ("file_id") ON UPDATE CASCADE;
ALTER TABLE "management_payments" ADD CONSTRAINT "management_payments_tenant_transaction_fkey" FOREIGN KEY ("tenant_id", "transaction_id") REFERENCES "management_transactions"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "management_repayments" ADD CONSTRAINT "management_repayments_tenant_loan_fkey" FOREIGN KEY ("tenant_id", "loan_id") REFERENCES "management_loans"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Actor/user references must point to a membership in the same tenant.
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_actor_membership_fkey" FOREIGN KEY ("tenant_id", "actor_user_id") REFERENCES "tenant_memberships"("tenant_id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_creator_membership_fkey" FOREIGN KEY ("tenant_id", "created_by") REFERENCES "tenant_memberships"("tenant_id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenant_creator_membership_fkey" FOREIGN KEY ("tenant_id", "created_by") REFERENCES "tenant_memberships"("tenant_id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communications" ADD CONSTRAINT "communications_tenant_creator_membership_fkey" FOREIGN KEY ("tenant_id", "created_by") REFERENCES "tenant_memberships"("tenant_id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenant_creator_membership_fkey" FOREIGN KEY ("tenant_id", "created_by") REFERENCES "tenant_memberships"("tenant_id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "files" ADD CONSTRAINT "files_tenant_uploader_membership_fkey" FOREIGN KEY ("tenant_id", "uploaded_by") REFERENCES "tenant_memberships"("tenant_id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_tenant_user_membership_fkey" FOREIGN KEY ("tenant_id", "user_id") REFERENCES "tenant_memberships"("tenant_id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS is the second line of defence. FORCE also protects table owners. The
-- application sets app.tenant_id with SET LOCAL in every scoped transaction.
DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'audit_logs','storage_deletion_jobs','customers','customer_addresses','projects',
    'communications','appointments','s3_objects','files','project_storage','materials',
    'suppliers','shop_article_groups','shop_articles','shop_hardware_mappings','time_entries',
    'management_periods','management_transactions','management_payments','management_assets',
    'management_loans','management_repayments'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)',
      table_name
    );
  END LOOP;
END $$;
