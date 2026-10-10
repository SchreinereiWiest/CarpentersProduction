-- Work types are managed in settings-company.json from now on. Existing enum
-- values are preserved as text, so historic time entries remain readable.
ALTER TABLE "time_entries"
ALTER COLUMN "work_type" TYPE TEXT
USING "work_type"::text;

ALTER TABLE "time_entries"
ADD COLUMN "custom_work_type" TEXT;

DROP TYPE "WorkType";
