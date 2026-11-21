CREATE TABLE "work_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "source_id" UUID NOT NULL,
  "assignee_id" UUID NOT NULL,
  "created_by" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "info" TEXT,
  "href" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "completed_at" TIMESTAMP(3),
  "dismissed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "work_assignments_tenant_id_kind_source_id_assignee_id_key"
ON "work_assignments"("tenant_id", "kind", "source_id", "assignee_id");
CREATE UNIQUE INDEX "work_assignments_tenant_id_id_key" ON "work_assignments"("tenant_id", "id");
CREATE INDEX "work_assignments_assignee_id_status_updated_at_idx" ON "work_assignments"("assignee_id", "status", "updated_at");
CREATE INDEX "work_assignments_created_by_status_updated_at_idx" ON "work_assignments"("created_by", "status", "updated_at");

ALTER TABLE "work_assignments"
  ADD CONSTRAINT "work_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "work_assignments_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "work_assignments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "work_assignments" ("tenant_id", "kind", "source_id", "assignee_id", "created_by", "title", "info", "href", "created_at", "updated_at")
SELECT a."tenant_id", 'project', a."project_id", a."assignee_id", a."created_by",
       COALESCE(p."project_number" || ' · ', '') || p."title", a."info", '/Projects/' || p."id", a."created_at", a."updated_at"
FROM "management_assignments" a
JOIN "projects" p ON p."id" = a."project_id";

INSERT INTO "work_assignments" ("tenant_id", "kind", "source_id", "assignee_id", "created_by", "title", "href", "created_at", "updated_at")
SELECT d."tenant_id", 'commercial_document', d."id", d."assigned_to", COALESCE(d."created_by", d."assigned_to"),
       COALESCE(d."document_number" || ' · ', '') || d."title", '/Belege/' || d."id", d."created_at", d."updated_at"
FROM "commercial_documents" d
WHERE d."assigned_to" IS NOT NULL;

INSERT INTO "work_assignments" ("tenant_id", "kind", "source_id", "assignee_id", "created_by", "title", "href", "created_at", "updated_at")
SELECT d."tenant_id", 'paperless_document', d."id", d."assigned_to", COALESCE(d."linked_by", d."assigned_to"),
       d."title", '/Documents?document=' || d."id", d."created_at", d."updated_at"
FROM "paperless_documents" d
WHERE d."assigned_to" IS NOT NULL;

ALTER TABLE "work_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_assignments" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "work_assignments"
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'carpenters_tenant_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "work_assignments" TO carpenters_tenant_app;
  END IF;
END $$;
