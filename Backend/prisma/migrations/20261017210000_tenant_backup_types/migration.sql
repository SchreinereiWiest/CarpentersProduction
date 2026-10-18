ALTER TABLE "tenant_backups"
ADD COLUMN "backup_type" TEXT NOT NULL DEFAULT 'full';

CREATE INDEX "tenant_backups_tenant_id_backup_type_created_at_idx"
ON "tenant_backups"("tenant_id", "backup_type", "created_at");
