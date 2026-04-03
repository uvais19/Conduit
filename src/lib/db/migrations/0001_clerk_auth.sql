-- Drop NextAuth tables (replaced by Clerk)
DROP TABLE IF EXISTS "verification_tokens";
DROP TABLE IF EXISTS "sessions";
DROP TABLE IF EXISTS "accounts";

-- Add clerkId to users, drop auth columns managed by Clerk
ALTER TABLE "users" ADD COLUMN "clerk_id" text UNIQUE;
ALTER TABLE "users" DROP COLUMN IF EXISTS "password_hash";
ALTER TABLE "users" DROP COLUMN IF EXISTS "email_verified";
