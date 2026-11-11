DO $$ BEGIN
  CREATE TYPE "webhook_delivery_status" AS ENUM ('pending', 'processed', 'skipped');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "platform" "platform" NOT NULL,
  "dedupe_key" text NOT NULL,
  "tenant_id" uuid,
  "event_type" text NOT NULL,
  "payload" jsonb NOT NULL,
  "status" "webhook_delivery_status" NOT NULL DEFAULT 'pending',
  "occurred_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "webhook_deliveries"
    ADD CONSTRAINT "webhook_deliveries_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "webhook_deliveries_platform_dedupe_unique"
  ON "webhook_deliveries" ("platform", "dedupe_key");
