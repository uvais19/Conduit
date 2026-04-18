-- Remove X and Google Business Profile: delete dependent rows, then shrink platform enum.

DELETE FROM "content_templates" WHERE "platform" IN ('x', 'gbp');
DELETE FROM "variant_learnings" WHERE "platform" IN ('x', 'gbp');
DELETE FROM "platform_analyses" WHERE "platform" IN ('x', 'gbp');
DELETE FROM "platform_posts" WHERE "platform" IN ('x', 'gbp');
DELETE FROM "competitor_profiles" WHERE "platform" IN ('x', 'gbp');
DELETE FROM "platform_connections" WHERE "platform" IN ('x', 'gbp');

DELETE FROM "content_drafts" WHERE "platform" IN ('x', 'gbp');

DELETE FROM "post_analytics" WHERE "platform" IN ('x', 'gbp');

ALTER TYPE "platform" RENAME TO "platform_old";
CREATE TYPE "platform" AS ENUM ('instagram', 'facebook', 'linkedin');

ALTER TABLE "platform_connections" ALTER COLUMN "platform" TYPE "platform" USING ("platform"::text::"platform");
ALTER TABLE "content_drafts" ALTER COLUMN "platform" TYPE "platform" USING ("platform"::text::"platform");
ALTER TABLE "post_analytics" ALTER COLUMN "platform" TYPE "platform" USING ("platform"::text::"platform");
ALTER TABLE "competitor_profiles" ALTER COLUMN "platform" TYPE "platform" USING ("platform"::text::"platform");
ALTER TABLE "platform_posts" ALTER COLUMN "platform" TYPE "platform" USING ("platform"::text::"platform");
ALTER TABLE "platform_analyses" ALTER COLUMN "platform" TYPE "platform" USING ("platform"::text::"platform");
ALTER TABLE "variant_learnings" ALTER COLUMN "platform" TYPE "platform" USING ("platform"::text::"platform");

-- Neon / extended schemas: optional tables that also used `platform` (not in all checkouts)
DO $$ BEGIN
  IF to_regclass('public.content_series') IS NOT NULL THEN
    DELETE FROM public.content_series WHERE platform::text IN ('x', 'gbp');
    ALTER TABLE public.content_series ALTER COLUMN platform TYPE platform USING (platform::text::platform);
  END IF;
  IF to_regclass('public.content_cluster_members') IS NOT NULL THEN
    DELETE FROM public.content_cluster_members WHERE platform::text IN ('x', 'gbp');
    ALTER TABLE public.content_cluster_members ALTER COLUMN platform TYPE platform USING (platform::text::platform);
  END IF;
END $$;

DROP TYPE "platform_old";
