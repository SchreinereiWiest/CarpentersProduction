-- Manuell erfasste Nachkalkulationen haben bewusst kein künstliches Projekt.
-- Ein NULL-Projekt kennzeichnet sie eindeutig, während alle bestehenden
-- Projekt-Snapshots und Tenant-Schutzregeln unverändert bleiben.
ALTER TABLE "calculation_snapshots"
DROP CONSTRAINT "calculation_snapshots_tenant_project_fkey";

ALTER TABLE "calculation_snapshots"
DROP CONSTRAINT "calculation_snapshots_project_id_fkey";

ALTER TABLE "calculation_snapshots"
ALTER COLUMN "project_id" DROP NOT NULL;

ALTER TABLE "calculation_snapshots"
ADD CONSTRAINT "calculation_snapshots_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "calculation_snapshots"
ADD CONSTRAINT "calculation_snapshots_tenant_project_fkey"
FOREIGN KEY ("tenant_id", "project_id") REFERENCES "projects"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
