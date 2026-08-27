import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env" });
config({ path: ".env.local", override: true });

// drizzle-kit opens long-lived sessions, so it needs the session-mode pooler
// rather than the transaction pooler the app runs on.
const url = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;

if (!url) {
  throw new Error("Missing MIGRATION_DATABASE_URL or DATABASE_URL");
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
