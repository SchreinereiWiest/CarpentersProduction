-- Shop master data is relational. Catalog images remain in object storage and
-- are referenced through the existing files table.

CREATE TABLE "suppliers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "external_id" TEXT,
    "procurement_type" TEXT,
    "procurement_config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shop_article_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_article_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shop_articles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "category" TEXT,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'Stk.',
    "net_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "supplier_id" UUID,
    "group_id" UUID,
    "image_file_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_articles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shop_hardware_mappings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "variant" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "article_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_hardware_mappings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "materials" DROP COLUMN "supplier";
ALTER TABLE "materials" ADD COLUMN "supplier_id" UUID;

CREATE INDEX "suppliers_name_idx" ON "suppliers"("name");
CREATE INDEX "shop_article_groups_name_idx" ON "shop_article_groups"("name");
CREATE INDEX "shop_articles_name_idx" ON "shop_articles"("name");
CREATE INDEX "shop_articles_sku_idx" ON "shop_articles"("sku");
CREATE INDEX "shop_articles_category_idx" ON "shop_articles"("category");
CREATE INDEX "shop_articles_supplier_id_idx" ON "shop_articles"("supplier_id");
CREATE INDEX "shop_articles_group_id_idx" ON "shop_articles"("group_id");
CREATE UNIQUE INDEX "shop_hardware_mappings_variant_color_key" ON "shop_hardware_mappings"("variant", "color");
CREATE INDEX "shop_hardware_mappings_article_id_idx" ON "shop_hardware_mappings"("article_id");

ALTER TABLE "materials" ADD CONSTRAINT "materials_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shop_articles" ADD CONSTRAINT "shop_articles_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shop_articles" ADD CONSTRAINT "shop_articles_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "shop_article_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shop_articles" ADD CONSTRAINT "shop_articles_image_file_id_fkey" FOREIGN KEY ("image_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shop_hardware_mappings" ADD CONSTRAINT "shop_hardware_mappings_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "shop_articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
