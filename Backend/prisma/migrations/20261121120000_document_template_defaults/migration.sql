ALTER TABLE "document_templates"
  ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "document_templates_tenant_id_document_type_is_default_idx"
  ON "document_templates"("tenant_id", "document_type", "is_default");

CREATE UNIQUE INDEX "document_templates_one_active_default_per_type"
  ON "document_templates"("tenant_id", "document_type")
  WHERE "is_default" = true AND "status" = 'active';
