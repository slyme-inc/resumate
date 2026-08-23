import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Database = PostgresJsDatabase<typeof schema>;

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Missing DATABASE_URL");
  }
  return url;
}

const globalForDb = globalThis as unknown as {
  postgres?: ReturnType<typeof postgres>;
  db?: Database;
};

export function getDb() {
  if (!globalForDb.db) {
    globalForDb.postgres = postgres(getDatabaseUrl(), {
      prepare: false,
      ssl: "require",
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    globalForDb.db = drizzle(globalForDb.postgres, { schema });
  }

  return globalForDb.db;
}
