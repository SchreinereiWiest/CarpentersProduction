CREATE TABLE "paperless_configurations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "base_url" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "auto_assign_qr" BOOLEAN NOT NULL DEFAULT true,
    "last_connected_at" TIMESTAMP(3),
    "last_connection_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "paperless_configurations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "paperless_folders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "configuration_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "paperless_folders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "paperless_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "configuration_id" UUID NOT NULL,
    "remote_document_id" INTEGER NOT NULL,
    "remote_version_id" INTEGER,
    "title" TEXT NOT NULL,
    "original_file_name" TEXT,
    "mime_type" TEXT,
    "checksum" TEXT,
    "document_type" TEXT,
    "correspondent" TEXT,
    "remote_created_at" TIMESTAMP(3),
    "remote_added_at" TIMESTAMP(3),
    "remote_modified_at" TIMESTAMP(3),
    "remote_metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'inbox',
    "qr_status" TEXT NOT NULL DEFAULT 'queued',
    "qr_payload" JSONB,
    "qr_error" TEXT,
    "assignment_source" TEXT,
    "customer_id" UUID,
    "project_id" UUID,
    "folder_id" UUID,
    "linked_by" UUID,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "paperless_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "paperless_configurations_tenant_id_key" ON "paperless_configurations"("tenant_id");
CREATE UNIQUE INDEX "paperless_configurations_tenant_id_id_key" ON "paperless_configurations"("tenant_id", "id");
CREATE UNIQUE INDEX "paperless_folders_tenant_id_id_key" ON "paperless_folders"("tenant_id", "id");
CREATE UNIQUE INDEX "paperless_folders_tenant_id_name_key" ON "paperless_folders"("tenant_id", "name");
CREATE INDEX "paperless_folders_configuration_id_sort_order_idx" ON "paperless_folders"("configuration_id", "sort_order");
CREATE UNIQUE INDEX "paperless_documents_tenant_id_id_key" ON "paperless_documents"("tenant_id", "id");
CREATE UNIQUE INDEX "paperless_documents_tenant_id_remote_document_id_key" ON "paperless_documents"("tenant_id", "remote_document_id");
CREATE INDEX "paperless_documents_status_received_at_idx" ON "paperless_documents"("status", "received_at");
CREATE INDEX "paperless_documents_project_id_linked_at_idx" ON "paperless_documents"("project_id", "linked_at");
CREATE INDEX "paperless_documents_customer_id_linked_at_idx" ON "paperless_documents"("customer_id", "linked_at");
CREATE INDEX "paperless_documents_folder_id_linked_at_idx" ON "paperless_documents"("folder_id", "linked_at");

ALTER TABLE "paperless_configurations" ADD CONSTRAINT "paperless_configurations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "paperless_folders" ADD CONSTRAINT "paperless_folders_configuration_id_fkey" FOREIGN KEY ("configuration_id") REFERENCES "paperless_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "paperless_documents" ADD CONSTRAINT "paperless_documents_configuration_id_fkey" FOREIGN KEY ("configuration_id") REFERENCES "paperless_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "paperless_documents" ADD CONSTRAINT "paperless_documents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "paperless_documents" ADD CONSTRAINT "paperless_documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "paperless_documents" ADD CONSTRAINT "paperless_documents_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "paperless_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "paperless_documents" ADD CONSTRAINT "paperless_documents_linked_by_fkey" FOREIGN KEY ("linked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "paperless_folders" ADD CONSTRAINT "paperless_folders_tenant_configuration_fkey" FOREIGN KEY ("tenant_id", "configuration_id") REFERENCES "paperless_configurations"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "paperless_documents" ADD CONSTRAINT "paperless_documents_tenant_configuration_fkey" FOREIGN KEY ("tenant_id", "configuration_id") REFERENCES "paperless_configurations"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "paperless_documents" ADD CONSTRAINT "paperless_documents_tenant_customer_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "customers"("tenant_id", "id") ON DELETE SET NULL ("customer_id") ON UPDATE CASCADE;
ALTER TABLE "paperless_documents" ADD CONSTRAINT "paperless_documents_tenant_project_fkey" FOREIGN KEY ("tenant_id", "project_id") REFERENCES "projects"("tenant_id", "id") ON DELETE SET NULL ("project_id") ON UPDATE CASCADE;
ALTER TABLE "paperless_documents" ADD CONSTRAINT "paperless_documents_tenant_folder_fkey" FOREIGN KEY ("tenant_id", "folder_id") REFERENCES "paperless_folders"("tenant_id", "id") ON DELETE SET NULL ("folder_id") ON UPDATE CASCADE;
ALTER TABLE "paperless_documents" ADD CONSTRAINT "paperless_documents_tenant_linked_by_fkey" FOREIGN KEY ("tenant_id", "linked_by") REFERENCES "tenant_memberships"("tenant_id", "user_id") ON DELETE SET NULL ("linked_by") ON UPDATE CASCADE;

ALTER TABLE "paperless_configurations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "paperless_configurations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "paperless_folders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "paperless_folders" FORCE ROW LEVEL SECURITY;
ALTER TABLE "paperless_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "paperless_documents" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "paperless_configurations" USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE POLICY "tenant_isolation" ON "paperless_folders" USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE POLICY "tenant_isolation" ON "paperless_documents" USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'carpenters_tenant_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "paperless_configurations", "paperless_folders", "paperless_documents" TO carpenters_tenant_app;
  END IF;
END $$;
