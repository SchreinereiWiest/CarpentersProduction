ALTER TABLE "calendar_events"
ADD COLUMN "is_private" BOOLEAN NOT NULL DEFAULT false;

-- Existing personal entries were created under the former private-calendar
-- contract. Keep that privacy choice during the migration; new entries are
-- shared by default and become private only through the explicit checkbox.
UPDATE "calendar_events"
SET "is_private" = true
WHERE "scope" = 'personal';

ALTER TABLE "calendar_events"
DROP CONSTRAINT "calendar_events_valid_type";

ALTER TABLE "calendar_events"
ADD CONSTRAINT "calendar_events_valid_type" CHECK ("type" IN (
    'project', 'measurement', 'planning', 'manufacturing', 'installation',
    'appointment', 'company-closed', 'vacation', 'other'
));
