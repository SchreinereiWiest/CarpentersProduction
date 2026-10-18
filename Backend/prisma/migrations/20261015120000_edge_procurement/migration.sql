ALTER TABLE "materials"
  ADD COLUMN "edge_article_number" TEXT,
  ADD COLUMN "edge_price_per_meter" DECIMAL(10,2),
  ADD COLUMN "edge_purchase_length" DOUBLE PRECISION NOT NULL DEFAULT 75;

CREATE TABLE "shop_configurations" (
  "tenant_id" UUID NOT NULL,
  "edge_waste_percentage" DECIMAL(6,2) NOT NULL DEFAULT 10,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "shop_configurations_pkey" PRIMARY KEY ("tenant_id")
);

ALTER TABLE "shop_configurations"
  ADD CONSTRAINT "shop_configurations_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'carpenters_tenant_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "shop_configurations" TO carpenters_tenant_app;
  END IF;
END $$;

ALTER TABLE "shop_configurations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shop_configurations" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "shop_configurations"
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
