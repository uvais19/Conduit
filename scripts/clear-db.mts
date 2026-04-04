import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set (.env or .env.local)");
  process.exit(1);
}

const sql = neon(url);
await sql`TRUNCATE TABLE tenants RESTART IDENTITY CASCADE`;
console.log("OK: truncated tenants and all CASCADE-dependent rows.");
