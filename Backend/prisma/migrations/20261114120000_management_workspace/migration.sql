CREATE TABLE "management_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "assignee_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "info" TEXT,
    "calendar_event_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "management_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "management_project_stages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "stage_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "management_project_stages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "management_annual_goals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "type_id" TEXT NOT NULL,
    "type_label" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "target_value" DECIMAL(16,2) NOT NULL,
    "target_date" DATE NOT NULL,
    "actual_value" DECIMAL(16,2),
    "actual_date" DATE,
    "note" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "management_annual_goals_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "management_annual_goals_year_check" CHECK ("year" BETWEEN 2000 AND 2200)
);

CREATE TABLE "management_goal_checkpoints" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "goal_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "value" DECIMAL(16,2) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "management_goal_checkpoints_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "management_assignments_calendar_event_id_key" ON "management_assignments"("calendar_event_id");
CREATE UNIQUE INDEX "management_assignments_tenant_id_project_id_assignee_id_key" ON "management_assignments"("tenant_id", "project_id", "assignee_id");
CREATE UNIQUE INDEX "management_assignments_tenant_id_id_key" ON "management_assignments"("tenant_id", "id");
CREATE INDEX "management_assignments_assignee_id_idx" ON "management_assignments"("assignee_id");
CREATE INDEX "management_assignments_project_id_idx" ON "management_assignments"("project_id");

CREATE UNIQUE INDEX "management_project_stages_tenant_id_project_id_key" ON "management_project_stages"("tenant_id", "project_id");
CREATE UNIQUE INDEX "management_project_stages_project_id_key" ON "management_project_stages"("project_id");
CREATE UNIQUE INDEX "management_project_stages_tenant_id_id_key" ON "management_project_stages"("tenant_id", "id");
CREATE INDEX "management_project_stages_stage_id_position_idx" ON "management_project_stages"("stage_id", "position");

CREATE UNIQUE INDEX "management_annual_goals_tenant_id_id_key" ON "management_annual_goals"("tenant_id", "id");
CREATE INDEX "management_annual_goals_year_type_id_idx" ON "management_annual_goals"("year", "type_id");
CREATE UNIQUE INDEX "management_goal_checkpoints_tenant_id_id_key" ON "management_goal_checkpoints"("tenant_id", "id");
CREATE INDEX "management_goal_checkpoints_goal_id_date_idx" ON "management_goal_checkpoints"("goal_id", "date");

ALTER TABLE "management_assignments" ADD CONSTRAINT "management_assignments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "management_assignments" ADD CONSTRAINT "management_assignments_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "management_assignments" ADD CONSTRAINT "management_assignments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "management_assignments" ADD CONSTRAINT "management_assignments_calendar_event_id_fkey" FOREIGN KEY ("calendar_event_id") REFERENCES "calendar_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "management_project_stages" ADD CONSTRAINT "management_project_stages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "management_annual_goals" ADD CONSTRAINT "management_annual_goals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "management_goal_checkpoints" ADD CONSTRAINT "management_goal_checkpoints_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "management_annual_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "management_assignments" ADD CONSTRAINT "management_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "management_project_stages" ADD CONSTRAINT "management_project_stages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "management_annual_goals" ADD CONSTRAINT "management_annual_goals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "management_goal_checkpoints" ADD CONSTRAINT "management_goal_checkpoints_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "management_assignments" ADD CONSTRAINT "management_assignments_tenant_project_fkey" FOREIGN KEY ("tenant_id", "project_id") REFERENCES "projects"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "management_assignments" ADD CONSTRAINT "management_assignments_tenant_assignee_membership_fkey" FOREIGN KEY ("tenant_id", "assignee_id") REFERENCES "tenant_memberships"("tenant_id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "management_assignments" ADD CONSTRAINT "management_assignments_tenant_creator_membership_fkey" FOREIGN KEY ("tenant_id", "created_by") REFERENCES "tenant_memberships"("tenant_id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "management_assignments" ADD CONSTRAINT "management_assignments_tenant_calendar_event_fkey" FOREIGN KEY ("tenant_id", "calendar_event_id") REFERENCES "calendar_events"("tenant_id", "id") ON DELETE SET NULL ("calendar_event_id") ON UPDATE CASCADE;
ALTER TABLE "management_project_stages" ADD CONSTRAINT "management_project_stages_tenant_project_fkey" FOREIGN KEY ("tenant_id", "project_id") REFERENCES "projects"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "management_annual_goals" ADD CONSTRAINT "management_annual_goals_tenant_creator_membership_fkey" FOREIGN KEY ("tenant_id", "created_by") REFERENCES "tenant_memberships"("tenant_id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "management_goal_checkpoints" ADD CONSTRAINT "management_goal_checkpoints_tenant_goal_fkey" FOREIGN KEY ("tenant_id", "goal_id") REFERENCES "management_annual_goals"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'management_assignments', 'management_project_stages',
    'management_annual_goals', 'management_goal_checkpoints'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)',
      table_name
    );
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'carpenters_tenant_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON
      "management_assignments", "management_project_stages",
      "management_annual_goals", "management_goal_checkpoints"
    TO carpenters_tenant_app;
  END IF;
END $$;
