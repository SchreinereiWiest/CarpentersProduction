-- New tenant tables are accessed after SET LOCAL ROLE carpenters_tenant_app.
-- RLS alone is not sufficient: PostgreSQL also requires explicit table grants.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'carpenters_tenant_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE
    ON "commissions", "document_templates", "commercial_documents"
    TO carpenters_tenant_app;
  END IF;
END $$;
