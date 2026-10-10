-- Existing JWTs do not contain auth_version and are rejected after deployment.
ALTER TABLE "users"
ADD COLUMN "auth_version" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "storage_deletion_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bucket_name" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storage_deletion_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "storage_deletion_jobs_bucket_name_object_key_key"
ON "storage_deletion_jobs"("bucket_name", "object_key");

CREATE INDEX "storage_deletion_jobs_status_next_attempt_at_idx"
ON "storage_deletion_jobs"("status", "next_attempt_at");
