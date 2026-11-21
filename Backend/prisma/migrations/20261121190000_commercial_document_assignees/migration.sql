ALTER TABLE "commercial_documents"
ADD COLUMN "assigned_to" UUID;

CREATE INDEX "commercial_documents_assigned_to_updated_at_idx"
ON "commercial_documents"("assigned_to", "updated_at");

ALTER TABLE "commercial_documents"
ADD CONSTRAINT "commercial_documents_assigned_to_fkey"
FOREIGN KEY ("assigned_to") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
