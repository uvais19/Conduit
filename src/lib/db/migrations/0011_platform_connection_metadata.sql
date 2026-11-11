ALTER TABLE "platform_connections" ADD COLUMN IF NOT EXISTS "display_name" text;
UPDATE "platform_connections" SET "display_name" = '' WHERE "display_name" IS NULL;
ALTER TABLE "platform_connections" ALTER COLUMN "display_name" SET DEFAULT '';
ALTER TABLE "platform_connections" ALTER COLUMN "display_name" SET NOT NULL;

ALTER TABLE "platform_connections" ADD COLUMN IF NOT EXISTS "last_refresh_attempt_at" timestamp;
ALTER TABLE "platform_connections" ADD COLUMN IF NOT EXISTS "last_refresh_error" text;

CREATE UNIQUE INDEX IF NOT EXISTS "platform_connections_tenant_platform_unique"
  ON "platform_connections" ("tenant_id", "platform");
