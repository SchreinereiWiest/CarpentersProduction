ALTER TABLE "management_project_schedules"
ADD COLUMN "calendar_event_id" UUID,
ADD COLUMN "calendar_type" TEXT;

CREATE UNIQUE INDEX "management_project_schedules_calendar_event_id_key"
ON "management_project_schedules"("calendar_event_id");

ALTER TABLE "management_project_schedules"
ADD CONSTRAINT "management_project_schedules_calendar_event_id_fkey"
FOREIGN KEY ("calendar_event_id") REFERENCES "calendar_events"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "management_project_schedules"
ADD CONSTRAINT "management_project_schedules_tenant_calendar_event_fkey"
FOREIGN KEY ("tenant_id", "calendar_event_id") REFERENCES "calendar_events"("tenant_id", "id")
ON DELETE SET NULL ("calendar_event_id") ON UPDATE CASCADE;
