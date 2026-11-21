-- Tenant-gebundene Fremdschlüssel verhindern auch unterhalb der Anwendung,
-- dass gültige UUIDs aus einem anderen Unternehmen verknüpft werden.
ALTER TABLE "commissions"
  ADD CONSTRAINT "commissions_tenant_customer_fkey"
  FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "customers"("tenant_id", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "projects"
  ADD CONSTRAINT "projects_tenant_commission_fkey"
  FOREIGN KEY ("tenant_id", "commission_id") REFERENCES "commissions"("tenant_id", "id")
  ON DELETE SET NULL ("commission_id") ON UPDATE CASCADE;

ALTER TABLE "commercial_documents"
  ADD CONSTRAINT "commercial_documents_tenant_customer_fkey"
    FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "customers"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "commercial_documents_tenant_project_fkey"
    FOREIGN KEY ("tenant_id", "project_id") REFERENCES "projects"("tenant_id", "id") ON DELETE SET NULL ("project_id") ON UPDATE CASCADE,
  ADD CONSTRAINT "commercial_documents_tenant_commission_fkey"
    FOREIGN KEY ("tenant_id", "commission_id") REFERENCES "commissions"("tenant_id", "id") ON DELETE SET NULL ("commission_id") ON UPDATE CASCADE,
  ADD CONSTRAINT "commercial_documents_tenant_template_fkey"
    FOREIGN KEY ("tenant_id", "template_id") REFERENCES "document_templates"("tenant_id", "id") ON DELETE SET NULL ("template_id") ON UPDATE CASCADE,
  ADD CONSTRAINT "commercial_documents_tenant_creator_membership_fkey"
    FOREIGN KEY ("tenant_id", "created_by") REFERENCES "tenant_memberships"("tenant_id", "user_id") ON DELETE SET NULL ("created_by") ON UPDATE CASCADE,
  ADD CONSTRAINT "commercial_documents_tenant_assignee_membership_fkey"
    FOREIGN KEY ("tenant_id", "assigned_to") REFERENCES "tenant_memberships"("tenant_id", "user_id") ON DELETE SET NULL ("assigned_to") ON UPDATE CASCADE;

ALTER TABLE "work_assignments"
  ADD CONSTRAINT "work_assignments_tenant_assignee_membership_fkey"
    FOREIGN KEY ("tenant_id", "assignee_id") REFERENCES "tenant_memberships"("tenant_id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "work_assignments_tenant_creator_membership_fkey"
    FOREIGN KEY ("tenant_id", "created_by") REFERENCES "tenant_memberships"("tenant_id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;
