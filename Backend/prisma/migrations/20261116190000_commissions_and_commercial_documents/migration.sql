CREATE TABLE "commissions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "commission_number" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "calculation" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "commissions_tenant_id_id_key" ON "commissions"("tenant_id", "id");
CREATE UNIQUE INDEX "commissions_tenant_id_commission_number_key" ON "commissions"("tenant_id", "commission_number");
CREATE INDEX "commissions_customer_id_created_at_idx" ON "commissions"("customer_id", "created_at");

ALTER TABLE "commissions"
  ADD CONSTRAINT "commissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "commissions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "projects" ADD COLUMN "commission_id" UUID;
CREATE INDEX "projects_commission_id_idx" ON "projects"("commission_id");
ALTER TABLE "projects"
  ADD CONSTRAINT "projects_commission_id_fkey" FOREIGN KEY ("commission_id") REFERENCES "commissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "document_templates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "file_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "document_type" TEXT NOT NULL DEFAULT 'universal',
  "status" TEXT NOT NULL DEFAULT 'active',
  "analysis" JSONB NOT NULL,
  "uploaded_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "document_templates_file_id_key" ON "document_templates"("file_id");
CREATE UNIQUE INDEX "document_templates_tenant_id_id_key" ON "document_templates"("tenant_id", "id");
CREATE INDEX "document_templates_tenant_id_status_created_at_idx" ON "document_templates"("tenant_id", "status", "created_at");

ALTER TABLE "document_templates"
  ADD CONSTRAINT "document_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "document_templates_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "document_templates_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "commercial_documents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "project_id" UUID,
  "commission_id" UUID,
  "template_id" UUID,
  "document_type" TEXT NOT NULL,
  "document_number" TEXT,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "intro_text" TEXT,
  "notes" TEXT,
  "items" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "totals" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "issued_at" TIMESTAMP(3),
  "due_at" TIMESTAMP(3),
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "commercial_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "commercial_documents_tenant_id_id_key" ON "commercial_documents"("tenant_id", "id");
CREATE UNIQUE INDEX "commercial_documents_tenant_id_document_number_key" ON "commercial_documents"("tenant_id", "document_number");
CREATE INDEX "commercial_documents_customer_id_created_at_idx" ON "commercial_documents"("customer_id", "created_at");
CREATE INDEX "commercial_documents_project_id_idx" ON "commercial_documents"("project_id");
CREATE INDEX "commercial_documents_commission_id_idx" ON "commercial_documents"("commission_id");

ALTER TABLE "commercial_documents"
  ADD CONSTRAINT "commercial_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "commercial_documents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "commercial_documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "commercial_documents_commission_id_fkey" FOREIGN KEY ("commission_id") REFERENCES "commissions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "commercial_documents_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "document_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "commercial_documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "commissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commissions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "commissions"
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "document_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_templates" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "document_templates"
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "commercial_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commercial_documents" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "commercial_documents"
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
