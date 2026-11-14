CREATE TABLE "management_project_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "planned_start" DATE NOT NULL,
    "planned_end" DATE NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "management_project_schedules_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "management_project_schedules_period_check" CHECK ("planned_end" >= "planned_start")
);

CREATE TABLE "management_employee_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "vacation_days" DECIMAL(6,2) NOT NULL DEFAULT 30,
    "annual_salary" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "management_employee_profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "management_employee_profiles_year_check" CHECK ("year" BETWEEN 2000 AND 2200),
    CONSTRAINT "management_employee_profiles_vacation_days_check" CHECK ("vacation_days" BETWEEN 0 AND 366),
    CONSTRAINT "management_employee_profiles_annual_salary_check" CHECK ("annual_salary" >= 0)
);

CREATE UNIQUE INDEX "management_project_schedules_project_id_key" ON "management_project_schedules"("project_id");
CREATE UNIQUE INDEX "management_project_schedules_tenant_id_project_id_key" ON "management_project_schedules"("tenant_id", "project_id");
CREATE UNIQUE INDEX "management_project_schedules_tenant_id_id_key" ON "management_project_schedules"("tenant_id", "id");
CREATE INDEX "management_project_schedules_planned_start_planned_end_idx" ON "management_project_schedules"("planned_start", "planned_end");
CREATE UNIQUE INDEX "management_employee_profiles_tenant_id_user_id_year_key" ON "management_employee_profiles"("tenant_id", "user_id", "year");
CREATE UNIQUE INDEX "management_employee_profiles_tenant_id_id_key" ON "management_employee_profiles"("tenant_id", "id");
CREATE INDEX "management_employee_profiles_year_idx" ON "management_employee_profiles"("year");

ALTER TABLE "management_project_schedules" ADD CONSTRAINT "management_project_schedules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "management_project_schedules" ADD CONSTRAINT "management_project_schedules_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "management_project_schedules" ADD CONSTRAINT "management_project_schedules_tenant_project_fkey" FOREIGN KEY ("tenant_id", "project_id") REFERENCES "projects"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "management_employee_profiles" ADD CONSTRAINT "management_employee_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "management_employee_profiles" ADD CONSTRAINT "management_employee_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "management_employee_profiles" ADD CONSTRAINT "management_employee_profiles_tenant_user_membership_fkey" FOREIGN KEY ("tenant_id", "user_id") REFERENCES "tenant_memberships"("tenant_id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "management_project_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "management_project_schedules" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "management_project_schedules"
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "management_employee_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "management_employee_profiles" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "management_employee_profiles"
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'carpenters_tenant_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON
      "management_project_schedules", "management_employee_profiles"
    TO carpenters_tenant_app;
  END IF;
END $$;
