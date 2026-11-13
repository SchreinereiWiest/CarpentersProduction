ALTER TABLE "files"
  ADD COLUMN "document_folder_id" UUID;

CREATE INDEX "files_document_folder_id_idx" ON "files"("document_folder_id");

ALTER TABLE "files"
  ADD CONSTRAINT "files_document_folder_id_fkey"
  FOREIGN KEY ("document_folder_id") REFERENCES "paperless_folders"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "files"
  ADD CONSTRAINT "files_tenant_document_folder_fkey"
  FOREIGN KEY ("tenant_id", "document_folder_id")
  REFERENCES "paperless_folders"("tenant_id", "id")
  ON DELETE SET NULL ("document_folder_id") ON UPDATE CASCADE;
