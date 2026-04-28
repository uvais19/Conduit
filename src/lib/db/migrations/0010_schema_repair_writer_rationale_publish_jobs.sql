-- Repair drifted environments where prior migrations were marked applied
-- but some objects are missing in the live database.

ALTER TABLE "content_drafts"
  ADD COLUMN IF NOT EXISTS "writer_rationale" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'publish_job_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "publish_job_status" AS ENUM ('pending', 'running', 'completed', 'failed');
  END IF;
END $$;

DO $$
BEGIN
  -- Keep enum aligned with schema.ts
  BEGIN
    ALTER TYPE "proposal_type" ADD VALUE IF NOT EXISTS 'platform_format_shift';
  EXCEPTION
    WHEN undefined_object THEN
      -- proposal_type may not exist in very old databases
      NULL;
  END;
END $$;

CREATE TABLE IF NOT EXISTS "publish_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "draft_id" uuid NOT NULL,
  "status" "publish_job_status" NOT NULL DEFAULT 'pending',
  "attempts" integer NOT NULL DEFAULT 0,
  "max_attempts" integer NOT NULL DEFAULT 3,
  "scheduled_for" timestamp NOT NULL,
  "started_at" timestamp,
  "completed_at" timestamp,
  "last_error" text,
  "metadata" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

ALTER TABLE "publish_jobs"
  ADD COLUMN IF NOT EXISTS "tenant_id" uuid,
  ADD COLUMN IF NOT EXISTS "draft_id" uuid,
  ADD COLUMN IF NOT EXISTS "status" "publish_job_status" DEFAULT 'pending' NOT NULL,
  ADD COLUMN IF NOT EXISTS "attempts" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "max_attempts" integer DEFAULT 3 NOT NULL,
  ADD COLUMN IF NOT EXISTS "scheduled_for" timestamp,
  ADD COLUMN IF NOT EXISTS "started_at" timestamp,
  ADD COLUMN IF NOT EXISTS "completed_at" timestamp,
  ADD COLUMN IF NOT EXISTS "last_error" text,
  ADD COLUMN IF NOT EXISTS "metadata" jsonb,
  ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL,
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'publish_jobs_tenant_id_tenants_id_fk'
  ) THEN
    ALTER TABLE "publish_jobs"
      ADD CONSTRAINT "publish_jobs_tenant_id_tenants_id_fk"
      FOREIGN KEY ("tenant_id")
      REFERENCES "public"."tenants"("id")
      ON DELETE cascade
      ON UPDATE no action;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'publish_jobs_draft_id_content_drafts_id_fk'
  ) THEN
    ALTER TABLE "publish_jobs"
      ADD CONSTRAINT "publish_jobs_draft_id_content_drafts_id_fk"
      FOREIGN KEY ("draft_id")
      REFERENCES "public"."content_drafts"("id")
      ON DELETE cascade
      ON UPDATE no action;
  END IF;
END $$;
