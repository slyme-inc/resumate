import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { setDefaultResultOrder } from "node:dns";
import postgres from "postgres";
import * as schema from "./schema";

type Database = PostgresJsDatabase<typeof schema>;
type Client = ReturnType<typeof postgres>;

// Vercel is IPv4-only, and Node 17+ resolves AAAA first.
if (typeof setDefaultResultOrder === "function") {
  setDefaultResultOrder("ipv4first");
}

/**
 * Serverless freezes the instance between requests, so an idle socket can be
 * dropped by the pooler or NAT while our timers are paused. Reusing it hangs
 * until the platform kills the request, so anything idle longer than
 * `idle_timeout` is discarded rather than trusted.
 */
const STALE_AFTER_MS = 20_000;

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Missing DATABASE_URL");
  }
  return url;
}

const globalForDb = globalThis as unknown as {
  postgres?: Client;
  db?: Database;
  dbLastUsedAt?: number;
};

function createClient() {
  return postgres(getDatabaseUrl(), {
    prepare: false,
    ssl: "require",
    // A single connection serializes every query. Pages issue 3–4 reads at
    // once; three slots let Promise.all actually overlap on Supavisor.
    max: 3,
    // Supavisor transaction mode can reassign the backend between pipelined
    // queries, which silently loses the response and leaves the promise
    // pending forever. Default is 100.
    max_pipeline: 0,
    idle_timeout: 20,
    max_lifetime: 60 * 10,
    connect_timeout: 10,
    connection: {
      statement_timeout: 15_000,
    },
  } as Parameters<typeof postgres>[1]);
}

export function getDb() {
  const now = Date.now();
  const idleFor = now - (globalForDb.dbLastUsedAt ?? now);

  if (globalForDb.db && idleFor > STALE_AFTER_MS) {
    const stale = globalForDb.postgres;
    globalForDb.db = undefined;
    globalForDb.postgres = undefined;
    void stale?.end({ timeout: 0 }).catch(() => {});
  }

  globalForDb.dbLastUsedAt = now;

  if (!globalForDb.db) {
    globalForDb.postgres = createClient();
    globalForDb.db = drizzle(globalForDb.postgres, { schema });
  }

  return globalForDb.db;
}
