CREATE TABLE "freepbx_configurations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "default_country_code" TEXT NOT NULL DEFAULT '+49',
  "last_webhook_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "freepbx_configurations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "freepbx_configurations_tenant_id_key"
  ON "freepbx_configurations"("tenant_id");
CREATE UNIQUE INDEX "freepbx_configurations_tenant_id_id_key"
  ON "freepbx_configurations"("tenant_id", "id");

ALTER TABLE "freepbx_configurations"
  ADD CONSTRAINT "freepbx_configurations_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "phone_calls" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "external_id" TEXT NOT NULL,
  "direction" TEXT NOT NULL DEFAULT 'inbound',
  "status" TEXT NOT NULL DEFAULT 'ringing',
  "caller_number" TEXT NOT NULL,
  "normalized_caller_number" TEXT NOT NULL,
  "called_number" TEXT,
  "customer_id" UUID,
  "communication_id" UUID,
  "started_at" TIMESTAMP(3) NOT NULL,
  "answered_at" TIMESTAMP(3),
  "ended_at" TIMESTAMP(3),
  "duration_seconds" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "phone_calls_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "phone_calls_tenant_id_id_key"
  ON "phone_calls"("tenant_id", "id");
CREATE UNIQUE INDEX "phone_calls_tenant_id_external_id_key"
  ON "phone_calls"("tenant_id", "external_id");
CREATE UNIQUE INDEX "phone_calls_communication_id_key"
  ON "phone_calls"("communication_id");
CREATE INDEX "phone_calls_status_started_at_idx"
  ON "phone_calls"("status", "started_at");
CREATE INDEX "phone_calls_customer_id_started_at_idx"
  ON "phone_calls"("customer_id", "started_at");

ALTER TABLE "phone_calls"
  ADD CONSTRAINT "phone_calls_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "phone_calls"
  ADD CONSTRAINT "phone_calls_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "phone_calls"
  ADD CONSTRAINT "phone_calls_communication_id_fkey"
  FOREIGN KEY ("communication_id") REFERENCES "communications"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "freepbx_configurations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "freepbx_configurations" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "freepbx_configurations"
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "phone_calls" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "phone_calls" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "phone_calls"
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'carpenters_tenant_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "freepbx_configurations" TO carpenters_tenant_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON "phone_calls" TO carpenters_tenant_app;
  END IF;
END $$;
