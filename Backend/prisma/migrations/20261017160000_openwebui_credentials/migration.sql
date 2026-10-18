CREATE TABLE "tenant_secrets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "auth_tag" TEXT NOT NULL,
    "key_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenant_secrets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_secrets_tenant_id_name_key"
ON "tenant_secrets"("tenant_id", "name");
CREATE UNIQUE INDEX "tenant_secrets_tenant_id_id_key"
ON "tenant_secrets"("tenant_id", "id");

ALTER TABLE "tenant_secrets"
ADD CONSTRAINT "tenant_secrets_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_secrets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_secrets" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "tenant_secrets"
USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'carpenters_tenant_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "tenant_secrets" TO carpenters_tenant_app;
  END IF;
END $$;
