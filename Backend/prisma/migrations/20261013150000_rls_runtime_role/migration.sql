-- The Compose database owner is a PostgreSQL superuser and therefore always
-- bypasses RLS. Scoped application transactions switch to this non-login,
-- non-superuser role before touching tenant data.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'carpenters_tenant_app') THEN
    CREATE ROLE carpenters_tenant_app
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOINHERIT
      NOBYPASSRLS;
  END IF;
END $$;

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
