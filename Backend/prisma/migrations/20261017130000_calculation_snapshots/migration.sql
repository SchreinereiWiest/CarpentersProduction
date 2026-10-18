CREATE TABLE "calculation_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "released_by" UUID,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "source_version" INTEGER NOT NULL,
    "project_title" TEXT NOT NULL,
    "project_number" TEXT,
    "project_type" TEXT,
    "description" TEXT,
    "filter_text" TEXT NOT NULL DEFAULT '',
    "cabinet_count" INTEGER NOT NULL DEFAULT 0,
    "cabinet_types" INTEGER NOT NULL DEFAULT 0,
    "complexity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "volume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "material_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "planned_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actual_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "variance_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "plan" JSONB NOT NULL,
    "actual" JSONB NOT NULL,
    "hourly_rates" JSONB NOT NULL,
    "calculation_basis" JSONB NOT NULL,
    "cabinet_summary" JSONB NOT NULL,
    "list_summary" JSONB NOT NULL,
    "filter_data" JSONB NOT NULL,
    "object_references" JSONB NOT NULL,
    "released_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "calculation_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "calculation_snapshots_tenant_id_id_key"
ON "calculation_snapshots"("tenant_id", "id");
CREATE UNIQUE INDEX "calculation_snapshots_tenant_id_project_id_source_version_key"
ON "calculation_snapshots"("tenant_id", "project_id", "source_version");
CREATE INDEX "calculation_snapshots_tenant_id_released_at_idx"
ON "calculation_snapshots"("tenant_id", "released_at");
CREATE INDEX "calculation_snapshots_tenant_id_project_type_cabinet_count_idx"
ON "calculation_snapshots"("tenant_id", "project_type", "cabinet_count");
CREATE INDEX "calculation_snapshots_project_id_released_at_idx"
ON "calculation_snapshots"("project_id", "released_at");

ALTER TABLE "calculation_snapshots"
ADD CONSTRAINT "calculation_snapshots_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "calculation_snapshots"
ADD CONSTRAINT "calculation_snapshots_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calculation_snapshots"
ADD CONSTRAINT "calculation_snapshots_released_by_fkey"
FOREIGN KEY ("released_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Zusätzliche tenantkonsistente Fremdschlüssel verhindern Querverweise auch
-- bei direktem SQL-Zugriff außerhalb von Prisma.
ALTER TABLE "calculation_snapshots"
ADD CONSTRAINT "calculation_snapshots_tenant_project_fkey"
FOREIGN KEY ("tenant_id", "project_id") REFERENCES "projects"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calculation_snapshots"
ADD CONSTRAINT "calculation_snapshots_tenant_releaser_membership_fkey"
FOREIGN KEY ("tenant_id", "released_by") REFERENCES "tenant_memberships"("tenant_id", "user_id") ON DELETE SET NULL ("released_by") ON UPDATE CASCADE;

ALTER TABLE "calculation_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calculation_snapshots" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "calculation_snapshots"
USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'carpenters_tenant_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "calculation_snapshots" TO carpenters_tenant_app;
  END IF;
END $$;
