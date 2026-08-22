import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Missing DATABASE_URL");
  }
  return url;
}

const globalForDb = globalThis as unknown as {
  postgres: ReturnType<typeof postgres> | undefined;
};

const client =
  globalForDb.postgres ??
  postgres(getDatabaseUrl(), {
    prepare: false,
    ssl: "require",
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.postgres = client;
}

export const db = drizzle(client, { schema });
