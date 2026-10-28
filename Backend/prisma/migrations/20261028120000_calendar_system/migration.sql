ALTER TABLE "projects"
ALTER COLUMN "status" SET DEFAULT 'inactive';

CREATE TABLE "calendar_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "project_id" UUID,
    "scope" TEXT NOT NULL DEFAULT 'personal',
    "type" TEXT NOT NULL DEFAULT 'other',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_at" TIMESTAMPTZ(3) NOT NULL,
    "end_at" TIMESTAMPTZ(3) NOT NULL,
    "all_day" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "calendar_events_valid_range" CHECK ("end_at" > "start_at"),
    CONSTRAINT "calendar_events_valid_scope" CHECK ("scope" IN ('production', 'personal')),
    CONSTRAINT "calendar_events_valid_type" CHECK ("type" IN (
        'project', 'measurement', 'planning', 'manufacturing', 'installation',
        'appointment', 'vacation', 'other'
    ))
);

CREATE UNIQUE INDEX "calendar_events_tenant_id_id_key"
ON "calendar_events"("tenant_id", "id");
CREATE INDEX "calendar_events_tenant_id_start_at_end_at_idx"
ON "calendar_events"("tenant_id", "start_at", "end_at");
CREATE INDEX "calendar_events_owner_user_id_start_at_idx"
ON "calendar_events"("owner_user_id", "start_at");
CREATE INDEX "calendar_events_project_id_start_at_idx"
ON "calendar_events"("project_id", "start_at");

ALTER TABLE "calendar_events"
ADD CONSTRAINT "calendar_events_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_events"
ADD CONSTRAINT "calendar_events_owner_user_id_fkey"
FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_events"
ADD CONSTRAINT "calendar_events_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "calendar_events"
ADD CONSTRAINT "calendar_events_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "calendar_events"
ADD CONSTRAINT "calendar_events_tenant_project_fkey"
FOREIGN KEY ("tenant_id", "project_id") REFERENCES "projects"("tenant_id", "id")
ON DELETE SET NULL ("project_id") ON UPDATE CASCADE;

ALTER TABLE "calendar_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calendar_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "calendar_events"
USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'carpenters_tenant_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "calendar_events" TO carpenters_tenant_app;
  END IF;
END $$;
