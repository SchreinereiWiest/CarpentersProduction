ALTER TABLE "communications"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN "external_id" TEXT,
  ADD COLUMN "message_id" TEXT,
  ADD COLUMN "direction" TEXT,
  ADD COLUMN "from_address" TEXT,
  ADD COLUMN "to_addresses" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "cc_addresses" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "occurred_at" TIMESTAMP(3),
  ADD COLUMN "attachments" JSONB;

CREATE UNIQUE INDEX "communications_tenant_id_customer_id_source_external_id_key"
  ON "communications"("tenant_id", "customer_id", "source", "external_id");
CREATE INDEX "communications_customer_id_occurred_at_idx"
  ON "communications"("customer_id", "occurred_at");

CREATE TABLE "contact_history_configurations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "host" TEXT NOT NULL,
  "port" INTEGER NOT NULL DEFAULT 993,
  "username" TEXT NOT NULL,
  "account_email" TEXT NOT NULL,
  "mailbox" TEXT NOT NULL DEFAULT 'INBOX',
  "initial_sync_days" INTEGER NOT NULL DEFAULT 90,
  "sync_interval_minutes" INTEGER NOT NULL DEFAULT 5,
  "uid_validity" TEXT,
  "last_uid" INTEGER NOT NULL DEFAULT 0,
  "last_connected_at" TIMESTAMP(3),
  "last_sync_at" TIMESTAMP(3),
  "last_sync_error" TEXT,
  "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "contact_history_configurations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "contact_history_configurations_tenant_id_key"
  ON "contact_history_configurations"("tenant_id");
CREATE UNIQUE INDEX "contact_history_configurations_tenant_id_id_key"
  ON "contact_history_configurations"("tenant_id", "id");

ALTER TABLE "contact_history_configurations"
  ADD CONSTRAINT "contact_history_configurations_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contact_history_configurations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contact_history_configurations" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "contact_history_configurations"
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'carpenters_tenant_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "contact_history_configurations" TO carpenters_tenant_app;
  END IF;
END $$;
