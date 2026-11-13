ALTER TABLE "materials" ADD COLUMN "edge_supplier_id" UUID;

-- Bestehende Materialien behalten ihr bisheriges Lieferantenverhalten. Nach
-- der Migration können Platte und Kante unabhängig voneinander geändert werden.
UPDATE "materials" SET "edge_supplier_id" = "supplier_id";

CREATE INDEX "materials_edge_supplier_id_idx" ON "materials"("edge_supplier_id");

ALTER TABLE "materials"
ADD CONSTRAINT "materials_edge_supplier_id_fkey"
FOREIGN KEY ("edge_supplier_id") REFERENCES "suppliers"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "materials"
ADD CONSTRAINT "materials_tenant_edge_supplier_fkey"
FOREIGN KEY ("tenant_id", "edge_supplier_id") REFERENCES "suppliers"("tenant_id", "id")
ON DELETE SET NULL ("edge_supplier_id") ON UPDATE CASCADE;
