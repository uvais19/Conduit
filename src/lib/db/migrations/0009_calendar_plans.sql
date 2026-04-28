CREATE TYPE "calendar_plan_status" AS ENUM ('active', 'archived');

CREATE TABLE "content_calendar_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "strategy_id" uuid,
  "strategy_version" integer DEFAULT 1 NOT NULL,
  "month" text NOT NULL,
  "timezone" text DEFAULT 'UTC' NOT NULL,
  "data" jsonb NOT NULL,
  "status" "calendar_plan_status" DEFAULT 'active' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "content_calendar_plans"
  ADD CONSTRAINT "content_calendar_plans_tenant_id_tenants_id_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "content_calendar_plans"
  ADD CONSTRAINT "content_calendar_plans_strategy_id_content_strategies_id_fk"
  FOREIGN KEY ("strategy_id") REFERENCES "public"."content_strategies"("id")
  ON DELETE set null ON UPDATE no action;

CREATE UNIQUE INDEX "content_calendar_plans_tenant_month_status_unique"
  ON "content_calendar_plans" USING btree ("tenant_id", "month", "status");
