CREATE TABLE "shop_catalog_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "supplier_id" UUID,
    "shop_article_id" UUID,
    "origin" TEXT NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shop_catalog_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shop_catalog_entries_tenant_id_id_key"
    ON "shop_catalog_entries"("tenant_id", "id");
CREATE UNIQUE INDEX "shop_catalog_entries_shop_article_id_key"
    ON "shop_catalog_entries"("shop_article_id");
CREATE INDEX "shop_catalog_entries_supplier_id_sku_idx"
    ON "shop_catalog_entries"("supplier_id", "sku");
CREATE INDEX "shop_catalog_entries_name_idx"
    ON "shop_catalog_entries"("name");

ALTER TABLE "shop_catalog_entries"
    ADD CONSTRAINT "shop_catalog_entries_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop_catalog_entries"
    ADD CONSTRAINT "shop_catalog_entries_tenant_supplier_fkey"
    FOREIGN KEY ("tenant_id", "supplier_id") REFERENCES "suppliers"("tenant_id", "id")
    ON DELETE SET NULL ("supplier_id") ON UPDATE CASCADE;
ALTER TABLE "shop_catalog_entries"
    ADD CONSTRAINT "shop_catalog_entries_tenant_article_fkey"
    FOREIGN KEY ("tenant_id", "shop_article_id") REFERENCES "shop_articles"("tenant_id", "id")
    ON DELETE SET NULL ("shop_article_id") ON UPDATE CASCADE;

ALTER TABLE "shop_catalog_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shop_catalog_entries" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "shop_catalog_entries"
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'carpenters_tenant_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "shop_catalog_entries" TO carpenters_tenant_app;
  END IF;
END $$;

