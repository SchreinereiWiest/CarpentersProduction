ALTER TABLE "shop_configurations"
ADD COLUMN "manufacturer_websites" JSONB NOT NULL DEFAULT '[]'::jsonb;
