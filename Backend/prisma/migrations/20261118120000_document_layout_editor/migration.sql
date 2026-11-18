ALTER TABLE "document_templates"
  ALTER COLUMN "file_id" DROP NOT NULL;

ALTER TABLE "commercial_documents"
  ADD COLUMN "field_values" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN "layout" JSONB NOT NULL DEFAULT '{}'::jsonb;
