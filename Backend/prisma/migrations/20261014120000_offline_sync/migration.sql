ALTER TABLE "files"
ADD COLUMN "server_version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "sync_mutations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "file_id" UUID,
    "response" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_mutations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sync_mutations_tenant_id_idempotency_key_key"
ON "sync_mutations"("tenant_id", "idempotency_key");

CREATE UNIQUE INDEX "sync_mutations_tenant_id_id_key"
ON "sync_mutations"("tenant_id", "id");

CREATE INDEX "sync_mutations_file_id_idx" ON "sync_mutations"("file_id");

ALTER TABLE "sync_mutations"
ADD CONSTRAINT "sync_mutations_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sync_mutations"
ADD CONSTRAINT "sync_mutations_file_id_fkey"
FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sync_mutations"
ADD CONSTRAINT "sync_mutations_tenant_file_fkey"
FOREIGN KEY ("tenant_id", "file_id") REFERENCES "files"("tenant_id", "id")
ON DELETE SET NULL ("file_id") ON UPDATE CASCADE;

ALTER TABLE "sync_mutations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sync_mutations" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "sync_mutations"
USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "sync_mutations" TO carpenters_tenant_app;
