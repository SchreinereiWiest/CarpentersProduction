CREATE TABLE "measurement_print_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "created_by" UUID,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "format" TEXT NOT NULL DEFAULT 'A4',
    "orientation" TEXT NOT NULL DEFAULT 'landscape',
    "source_version" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "measurement_print_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "measurement_print_pages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "print_run_id" UUID NOT NULL,
    "view_id" TEXT NOT NULL,
    "page_number" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "width_mm" DOUBLE PRECISION NOT NULL,
    "height_mm" DOUBLE PRECISION NOT NULL,
    "fields" JSONB NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "measurement_print_pages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "measurement_scans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "print_run_id" UUID,
    "print_page_id" UUID,
    "project_id" UUID,
    "uploaded_by" UUID,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "raw_identifier" TEXT,
    "alignment" JSONB,
    "result" JSONB,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "applied_at" TIMESTAMP(3),
    CONSTRAINT "measurement_scans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "measurement_scan_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "scan_id" UUID NOT NULL,
    "field_id" TEXT NOT NULL,
    "object_id" TEXT NOT NULL,
    "view_id" TEXT NOT NULL,
    "label" TEXT,
    "unit" TEXT,
    "raw_text" TEXT,
    "predicted_value" TEXT,
    "confidence" DOUBLE PRECISION,
    "accepted_value" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "crop_metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "measurement_scan_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "measurement_print_runs_tenant_id_id_key" ON "measurement_print_runs"("tenant_id", "id");
CREATE INDEX "measurement_print_runs_project_id_created_at_idx" ON "measurement_print_runs"("project_id", "created_at");
CREATE UNIQUE INDEX "measurement_print_pages_tenant_id_id_key" ON "measurement_print_pages"("tenant_id", "id");
CREATE UNIQUE INDEX "measurement_print_pages_tenant_id_identifier_key" ON "measurement_print_pages"("tenant_id", "identifier");
CREATE UNIQUE INDEX "measurement_print_pages_print_run_id_page_number_key" ON "measurement_print_pages"("print_run_id", "page_number");
CREATE INDEX "measurement_print_pages_print_run_id_idx" ON "measurement_print_pages"("print_run_id");
CREATE UNIQUE INDEX "measurement_scans_file_id_key" ON "measurement_scans"("file_id");
CREATE UNIQUE INDEX "measurement_scans_tenant_id_id_key" ON "measurement_scans"("tenant_id", "id");
CREATE INDEX "measurement_scans_project_id_created_at_idx" ON "measurement_scans"("project_id", "created_at");
CREATE INDEX "measurement_scans_status_created_at_idx" ON "measurement_scans"("status", "created_at");
CREATE UNIQUE INDEX "measurement_scan_items_tenant_id_id_key" ON "measurement_scan_items"("tenant_id", "id");
CREATE UNIQUE INDEX "measurement_scan_items_scan_id_field_id_key" ON "measurement_scan_items"("scan_id", "field_id");
CREATE INDEX "measurement_scan_items_scan_id_idx" ON "measurement_scan_items"("scan_id");

ALTER TABLE "measurement_print_runs" ADD CONSTRAINT "measurement_print_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "measurement_print_runs" ADD CONSTRAINT "measurement_print_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "measurement_print_runs" ADD CONSTRAINT "measurement_print_runs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "measurement_print_pages" ADD CONSTRAINT "measurement_print_pages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "measurement_print_pages" ADD CONSTRAINT "measurement_print_pages_print_run_id_fkey" FOREIGN KEY ("print_run_id") REFERENCES "measurement_print_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "measurement_scans" ADD CONSTRAINT "measurement_scans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "measurement_scans" ADD CONSTRAINT "measurement_scans_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "measurement_scans" ADD CONSTRAINT "measurement_scans_print_run_id_fkey" FOREIGN KEY ("print_run_id") REFERENCES "measurement_print_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "measurement_scans" ADD CONSTRAINT "measurement_scans_print_page_id_fkey" FOREIGN KEY ("print_page_id") REFERENCES "measurement_print_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "measurement_scans" ADD CONSTRAINT "measurement_scans_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "measurement_scans" ADD CONSTRAINT "measurement_scans_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "measurement_scan_items" ADD CONSTRAINT "measurement_scan_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "measurement_scan_items" ADD CONSTRAINT "measurement_scan_items_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "measurement_scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "measurement_print_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "measurement_print_pages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "measurement_scans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "measurement_scan_items" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "measurement_print_runs" USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE POLICY "tenant_isolation" ON "measurement_print_pages" USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE POLICY "tenant_isolation" ON "measurement_scans" USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE POLICY "tenant_isolation" ON "measurement_scan_items" USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'carpenters_tenant_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "measurement_print_runs", "measurement_print_pages", "measurement_scans", "measurement_scan_items" TO carpenters_tenant_app;
  END IF;
END $$;
