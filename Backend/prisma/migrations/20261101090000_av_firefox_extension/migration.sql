ALTER TABLE "suppliers" ADD COLUMN "shop_url" TEXT;

UPDATE "suppliers"
SET "procurement_type" = 'av-firefox-extension'
WHERE "procurement_type" = 'haefele-browser-extension';

UPDATE "suppliers"
SET "shop_url" = 'https://www.haefele.de/de/'
WHERE "procurement_type" = 'av-firefox-extension'
  AND "shop_url" IS NULL
  AND LOWER("name") LIKE '%häfele%';
