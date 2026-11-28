CREATE TABLE "tenant_onboarding" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "current_step" TEXT NOT NULL DEFAULT 'welcome',
    "completed_steps" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "skipped_steps" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "reset_count" INTEGER NOT NULL DEFAULT 0,
    "started_by" UUID,
    "completed_by" UUID,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenant_onboarding_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tenant_onboarding_status_check" CHECK ("status" IN ('pending', 'in_progress', 'completed'))
);

CREATE UNIQUE INDEX "tenant_onboarding_tenant_id_key" ON "tenant_onboarding"("tenant_id");
CREATE UNIQUE INDEX "tenant_onboarding_tenant_id_id_key" ON "tenant_onboarding"("tenant_id", "id");

ALTER TABLE "tenant_onboarding"
ADD CONSTRAINT "tenant_onboarding_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Installationen, die bereits vor Einführung des Assistenten Benutzer hatten,
-- bleiben abgeschlossen. Neue Tenants haben noch keine Membership und starten
-- beim Bootstrap beziehungsweise beim ersten Admin-Login mit einem leeren Flow.
INSERT INTO "tenant_onboarding" (
  "tenant_id", "status", "current_step", "completed_at", "created_at", "updated_at"
)
SELECT
  tenant."id", 'completed', 'tour', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "tenants" tenant
WHERE EXISTS (
  SELECT 1 FROM "tenant_memberships" membership WHERE membership."tenant_id" = tenant."id"
);

ALTER TABLE "tenant_onboarding" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_onboarding" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tenant_onboarding"
USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'carpenters_tenant_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "tenant_onboarding" TO carpenters_tenant_app;
  END IF;
END $$;
