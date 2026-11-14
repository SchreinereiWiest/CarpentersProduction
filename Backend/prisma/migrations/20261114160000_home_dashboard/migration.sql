ALTER TABLE "tenant_memberships"
ADD COLUMN "preferences" JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE "paperless_documents"
ADD COLUMN "assigned_to" UUID;

CREATE INDEX "paperless_documents_assigned_to_status_idx"
ON "paperless_documents"("assigned_to", "status");

ALTER TABLE "paperless_documents"
ADD CONSTRAINT "paperless_documents_assigned_to_fkey"
FOREIGN KEY ("assigned_to") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "paperless_documents"
ADD CONSTRAINT "paperless_documents_tenant_assignee_membership_fkey"
FOREIGN KEY ("tenant_id", "assigned_to") REFERENCES "tenant_memberships"("tenant_id", "user_id")
ON DELETE SET NULL ("assigned_to") ON UPDATE CASCADE;
