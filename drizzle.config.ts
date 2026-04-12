import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: [
    "./src/lib/db/schema.ts",
    "./src/lib/audit-log.ts",
    "./src/lib/content/templates.ts",
    "./src/lib/content/comments.ts",
    "./src/lib/content/versioning.ts",
  ],
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
