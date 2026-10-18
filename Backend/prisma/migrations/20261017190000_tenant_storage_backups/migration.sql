CREATE TABLE "tenant_backups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'creating',
    "object_key" TEXT,
    "bucket_name" TEXT,
    "file_size" BIGINT,
    "checksum" TEXT,
    "file_count" INTEGER NOT NULL DEFAULT 0,
    "table_count" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "restored_at" TIMESTAMP(3),

    CONSTRAINT "tenant_backups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_backups_tenant_id_id_key"
ON "tenant_backups"("tenant_id", "id");

CREATE INDEX "tenant_backups_tenant_id_created_at_idx"
ON "tenant_backups"("tenant_id", "created_at");

ALTER TABLE "tenant_backups"
ADD CONSTRAINT "tenant_backups_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_backups"
ADD CONSTRAINT "tenant_backups_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tenant_backups" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "tenant_backups"
USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'carpenters_tenant_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "tenant_backups" TO carpenters_tenant_app;
  END IF;
END $$;
