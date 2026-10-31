CREATE TABLE "supplier_catalog_articles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "normalized_sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT,
    "net_price" DECIMAL(12,2),
    "image_url" TEXT,
    "source_version" TEXT,
    "source_file" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "supplier_catalog_articles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "supplier_catalog_articles_tenant_id_supplier_id_sku_key"
    ON "supplier_catalog_articles"("tenant_id", "supplier_id", "sku");
CREATE UNIQUE INDEX "supplier_catalog_articles_tenant_id_supplier_id_normalized_sku_key"
    ON "supplier_catalog_articles"("tenant_id", "supplier_id", "normalized_sku");
CREATE UNIQUE INDEX "supplier_catalog_articles_tenant_id_id_key"
    ON "supplier_catalog_articles"("tenant_id", "id");
CREATE INDEX "supplier_catalog_articles_supplier_id_sku_idx"
    ON "supplier_catalog_articles"("supplier_id", "sku");

ALTER TABLE "supplier_catalog_articles"
    ADD CONSTRAINT "supplier_catalog_articles_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_catalog_articles"
    ADD CONSTRAINT "supplier_catalog_articles_supplier_id_fkey"
    FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "suppliers" SET "procurement_type" = 'datanorm' WHERE "procurement_type" = 'wuerth-ids';
UPDATE "suppliers" SET "procurement_type" = 'haefele-browser-extension' WHERE "procurement_type" = 'haefele-playwright';

ALTER TABLE "supplier_catalog_articles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "supplier_catalog_articles" FORCE ROW LEVEL SECURITY;
CREATE POLICY "supplier_catalog_articles_tenant_isolation" ON "supplier_catalog_articles"
    USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'carpenters_tenant_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "supplier_catalog_articles" TO carpenters_tenant_app;
  END IF;
END $$;
