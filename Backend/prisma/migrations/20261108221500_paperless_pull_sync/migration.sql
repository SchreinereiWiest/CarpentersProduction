ALTER TABLE "paperless_configurations"
  ADD COLUMN "last_remote_document_id" INTEGER,
  ADD COLUMN "last_sync_at" TIMESTAMP(3),
  ADD COLUMN "last_sync_error" TEXT;
