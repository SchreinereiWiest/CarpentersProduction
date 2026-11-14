ALTER TABLE "management_project_schedules"
ADD COLUMN "plan" JSONB NOT NULL DEFAULT '[]'::jsonb;
