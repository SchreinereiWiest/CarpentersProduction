CREATE TABLE "purchase_lists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "purchase_lists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_list_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "list_id" UUID NOT NULL,
    "article_id" UUID NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "purchase_list_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shop_article_archives" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "article_id" UUID NOT NULL,
    "supplier_id" UUID,
    "supplier_name" TEXT NOT NULL,
    "sku" TEXT,
    "net_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'Stk.',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shop_article_archives_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "non_project_purchases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "list_id" UUID,
    "list_name" TEXT NOT NULL,
    "article_id" UUID,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "category" TEXT,
    "description" TEXT,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "net_price" DECIMAL(12,2),
    "supplier_id" UUID,
    "supplier_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'released',
    "purchased_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "non_project_purchases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "purchase_lists_tenant_id_id_key" ON "purchase_lists"("tenant_id", "id");
CREATE INDEX "purchase_lists_name_idx" ON "purchase_lists"("name");
CREATE INDEX "purchase_lists_category_idx" ON "purchase_lists"("category");
CREATE UNIQUE INDEX "purchase_list_items_tenant_id_list_id_article_id_key" ON "purchase_list_items"("tenant_id", "list_id", "article_id");
CREATE UNIQUE INDEX "purchase_list_items_tenant_id_id_key" ON "purchase_list_items"("tenant_id", "id");
CREATE INDEX "purchase_list_items_list_id_idx" ON "purchase_list_items"("list_id");
CREATE INDEX "purchase_list_items_article_id_idx" ON "purchase_list_items"("article_id");
CREATE UNIQUE INDEX "shop_article_archives_tenant_id_id_key" ON "shop_article_archives"("tenant_id", "id");
CREATE INDEX "shop_article_archives_article_id_idx" ON "shop_article_archives"("article_id");
CREATE INDEX "shop_article_archives_supplier_id_idx" ON "shop_article_archives"("supplier_id");
CREATE INDEX "shop_article_archives_supplier_name_idx" ON "shop_article_archives"("supplier_name");
CREATE INDEX "shop_article_archives_sku_idx" ON "shop_article_archives"("sku");
CREATE UNIQUE INDEX "non_project_purchases_tenant_id_id_key" ON "non_project_purchases"("tenant_id", "id");
CREATE INDEX "non_project_purchases_status_idx" ON "non_project_purchases"("status");
CREATE INDEX "non_project_purchases_list_id_idx" ON "non_project_purchases"("list_id");
CREATE INDEX "non_project_purchases_article_id_idx" ON "non_project_purchases"("article_id");
CREATE INDEX "non_project_purchases_supplier_id_idx" ON "non_project_purchases"("supplier_id");

ALTER TABLE "purchase_lists" ADD CONSTRAINT "purchase_lists_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_list_items" ADD CONSTRAINT "purchase_list_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shop_article_archives" ADD CONSTRAINT "shop_article_archives_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "non_project_purchases" ADD CONSTRAINT "non_project_purchases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_list_items" ADD CONSTRAINT "purchase_list_items_tenant_list_fkey" FOREIGN KEY ("tenant_id", "list_id") REFERENCES "purchase_lists"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_list_items" ADD CONSTRAINT "purchase_list_items_tenant_article_fkey" FOREIGN KEY ("tenant_id", "article_id") REFERENCES "shop_articles"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop_article_archives" ADD CONSTRAINT "shop_article_archives_tenant_article_fkey" FOREIGN KEY ("tenant_id", "article_id") REFERENCES "shop_articles"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop_article_archives" ADD CONSTRAINT "shop_article_archives_tenant_supplier_fkey" FOREIGN KEY ("tenant_id", "supplier_id") REFERENCES "suppliers"("tenant_id", "id") ON DELETE SET NULL ("supplier_id") ON UPDATE CASCADE;
ALTER TABLE "non_project_purchases" ADD CONSTRAINT "non_project_purchases_tenant_list_fkey" FOREIGN KEY ("tenant_id", "list_id") REFERENCES "purchase_lists"("tenant_id", "id") ON DELETE SET NULL ("list_id") ON UPDATE CASCADE;
ALTER TABLE "non_project_purchases" ADD CONSTRAINT "non_project_purchases_tenant_article_fkey" FOREIGN KEY ("tenant_id", "article_id") REFERENCES "shop_articles"("tenant_id", "id") ON DELETE SET NULL ("article_id") ON UPDATE CASCADE;
ALTER TABLE "non_project_purchases" ADD CONSTRAINT "non_project_purchases_tenant_supplier_fkey" FOREIGN KEY ("tenant_id", "supplier_id") REFERENCES "suppliers"("tenant_id", "id") ON DELETE SET NULL ("supplier_id") ON UPDATE CASCADE;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['purchase_lists','purchase_list_items','shop_article_archives','non_project_purchases']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)',
      table_name
    );
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'carpenters_tenant_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "purchase_lists", "purchase_list_items", "shop_article_archives", "non_project_purchases" TO carpenters_tenant_app;
  END IF;
END $$;
