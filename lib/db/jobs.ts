import { getDb } from "@/lib/db";
import { job, savedJob } from "@/lib/db/schema";
import type { JobRow } from "@/lib/matching/job";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";

/** Must mirror `job_search_idx` exactly for the index to be used. */
const SEARCH_VECTOR = sql`to_tsvector('english', coalesce(${job.position}, '') || ' ' || coalesce(${job.company}, '') || ' ' || coalesce(${job.description}, ''))`;

/** websearch_to_tsquery treats bare words as AND, so OR must be explicit. */
function toSearchQuery(terms: string[]) {
  const cleaned = terms
    .map((term) => term.replace(/[^a-zA-Z0-9+#. ]/g, " ").trim())
    .filter((term) => term.length > 1)
    .map((term) => (term.includes(" ") ? `"${term}"` : term));

  return cleaned.length > 0 ? cleaned.join(" OR ") : null;
}

export type JobPoolOptions = {
  /** Free-text search from the user. */
  query?: string | null;
  /** Skill labels used to bias the recommended feed toward the candidate. */
  skillTerms?: string[];
  source?: string | null;
  limit?: number;
};

/**
 * Pull a bounded candidate set for in-memory scoring. Scoring every one of the
 * ~6k rows per request would be wasteful, so Postgres narrows first.
 */
export async function fetchJobPool({
  query,
  skillTerms = [],
  source,
  limit = 400,
}: JobPoolOptions): Promise<JobRow[]> {
  const conditions: SQL[] = [];

  const userQuery = query?.trim() ? query.trim() : null;
  if (userQuery) {
    conditions.push(sql`${SEARCH_VECTOR} @@ websearch_to_tsquery('english', ${userQuery})`);
  } else {
    const skillQuery = toSearchQuery(skillTerms);
    if (skillQuery) {
      conditions.push(sql`${SEARCH_VECTOR} @@ websearch_to_tsquery('english', ${skillQuery})`);
    }
  }

  if (source) {
    conditions.push(eq(job.source, source));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return getDb()
    .select()
    .from(job)
    .where(where)
    .orderBy(sql`${job.date} desc nulls last`)
    .limit(limit);
}

export async function getJob(source: string, id: string): Promise<JobRow | null> {
  const [row] = await getDb()
    .select()
    .from(job)
    .where(and(eq(job.source, source), eq(job.id, id)))
    .limit(1);

  return row ?? null;
}

export async function listSources() {
  const rows = await getDb()
    .select({ source: job.source, count: sql<number>`count(*)::int` })
    .from(job)
    .groupBy(job.source)
    .orderBy(desc(sql`count(*)`));

  return rows;
}

export async function countJobs() {
  const [row] = await getDb().select({ count: sql<number>`count(*)::int` }).from(job);
  return row?.count ?? 0;
}

export async function listSavedKeys(userId: string) {
  const rows = await getDb()
    .select({ source: savedJob.jobSource, id: savedJob.jobId })
    .from(savedJob)
    .where(eq(savedJob.userId, userId));

  return new Set(rows.map((row) => `${row.source}:${row.id}`));
}

export async function listSavedJobs(userId: string) {
  return getDb()
    .select({
      job,
      matchScore: savedJob.matchScore,
      savedAt: savedJob.createdAt,
    })
    .from(savedJob)
    .innerJoin(
      job,
      and(eq(savedJob.jobSource, job.source), eq(savedJob.jobId, job.id)),
    )
    .where(eq(savedJob.userId, userId))
    .orderBy(desc(savedJob.createdAt));
}

export async function countSavedJobs(userId: string) {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(savedJob)
    .where(eq(savedJob.userId, userId));

  return row?.count ?? 0;
}

export async function saveJob(
  userId: string,
  source: string,
  id: string,
  matchScore: number | null,
) {
  await getDb()
    .insert(savedJob)
    .values({ userId, jobSource: source, jobId: id, matchScore })
    .onConflictDoNothing();
}

export async function unsaveJob(userId: string, source: string, id: string) {
  await getDb()
    .delete(savedJob)
    .where(
      and(
        eq(savedJob.userId, userId),
        eq(savedJob.jobSource, source),
        eq(savedJob.jobId, id),
      ),
    );
}
