-- The Compose database owner is a PostgreSQL superuser and therefore always
-- bypasses RLS. Create a restricted runtime role where the database provider
-- permits role management. On managed databases without CREATEROLE the
-- non-superuser application role is protected by FORCE ROW LEVEL SECURITY
-- directly and does not need this compatibility role.
DO $$
DECLARE
  can_create_role BOOLEAN := FALSE;
  runtime_role_created BOOLEAN := FALSE;
BEGIN
  SELECT COALESCE(rolsuper OR rolcreaterole, FALSE)
    INTO can_create_role
    FROM pg_roles
   WHERE rolname = current_user;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'carpenters_tenant_app') THEN
    IF can_create_role THEN
      CREATE ROLE carpenters_tenant_app NOLOGIN NOINHERIT;
      runtime_role_created := TRUE;
    END IF;
  END IF;

  -- Non-superusers with CREATEROLE are not guaranteed to be able to SET ROLE
  -- across all supported PostgreSQL versions unless membership is explicit.
  IF runtime_role_created THEN
    EXECUTE format('GRANT carpenters_tenant_app TO %I', current_user);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'carpenters_tenant_app') THEN
    GRANT USAGE ON SCHEMA public TO carpenters_tenant_app;
    GRANT SELECT ON "tenants", "tenant_memberships", "tenant_licenses", "users" TO carpenters_tenant_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON
      "audit_logs", "storage_deletion_jobs", "customers", "customer_addresses", "projects",
      "communications", "appointments", "s3_objects", "files", "project_storage", "materials",
      "suppliers", "shop_article_groups", "shop_articles", "shop_hardware_mappings", "time_entries",
      "management_periods", "management_transactions", "management_payments", "management_assets",
      "management_loans", "management_repayments"
    TO carpenters_tenant_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO carpenters_tenant_app;
  END IF;
END $$;
