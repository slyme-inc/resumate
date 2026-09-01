import { getDb } from "@/lib/db";
import { job, jobRoleCard, savedJob } from "@/lib/db/schema";
import type { JobRow, JobScoreRow } from "@/lib/matching/job";
import { isRoleCard } from "@/lib/matching/role-card";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { unstable_cache } from "next/cache";

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

type CachedJobScoreRow = Omit<JobScoreRow, "date"> & { date: string | null };

function revivePoolRow(row: CachedJobScoreRow): JobScoreRow {
  return {
    ...row,
    date: row.date ? new Date(row.date) : null,
  };
}

async function queryJobPool({
  query,
  skillTerms = [],
  source,
  limit = 200,
}: JobPoolOptions): Promise<CachedJobScoreRow[]> {
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

  const rows = await getDb()
    .select({
      source: job.source,
      id: job.id,
      slug: job.slug,
      company: job.company,
      companyLogo: job.companyLogo,
      logo: job.logo,
      position: job.position,
      tags: job.tags,
      description: sql<string | null>`left(${job.description}, 5000)`,
      location: job.location,
      applyUrl: job.applyUrl,
      url: job.url,
      date: job.date,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      roleCard: jobRoleCard.card,
    })
    .from(job)
    .leftJoin(jobRoleCard, and(eq(job.source, jobRoleCard.source), eq(job.id, jobRoleCard.id)))
    .where(where)
    .orderBy(sql`${job.date} desc nulls last`)
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    date: row.date ? row.date.toISOString() : null,
    roleCard: isRoleCard(row.roleCard) ? row.roleCard : null,
  }));
}

const loadJobPool = unstable_cache(
  async (query: string | null, skillKey: string, source: string | null, limit: number) => {
    return queryJobPool({
      query,
      skillTerms: skillKey ? skillKey.split("\n") : [],
      source,
      limit,
    });
  },
  ["job-pool"],
  { revalidate: 90, tags: ["job-pool"] },
);

/**
 * Pull a bounded candidate set for in-memory scoring. Scoring every one of the
 * ~6k rows per request would be wasteful, so Postgres narrows first.
 *
 * Descriptions are clipped in SQL: a full HTML blob per row dominates transfer
 * and the skill extractor only needs the opening of the posting.
 */
export async function fetchJobPool(options: JobPoolOptions): Promise<JobScoreRow[]> {
  const rows = await loadJobPool(
    options.query?.trim() || null,
    (options.skillTerms ?? []).join("\n"),
    options.source ?? null,
    options.limit ?? 200,
  );
  return rows.map(revivePoolRow);
}

export async function getJob(source: string, id: string): Promise<JobRow | null> {
  const [row] = await getDb()
    .select()
    .from(job)
    .where(and(eq(job.source, source), eq(job.id, id)))
    .limit(1);

  return row ?? null;
}

const loadSources = unstable_cache(
  async () => {
    return getDb()
      .select({ source: job.source, count: sql<number>`count(*)::int` })
      .from(job)
      .groupBy(job.source)
      .orderBy(desc(sql`count(*)`));
  },
  ["job-sources"],
  { revalidate: 120 },
);

export function listSources() {
  return loadSources();
}

const loadJobCount = unstable_cache(
  async () => {
    const [row] = await getDb().select({ count: sql<number>`count(*)::int` }).from(job);
    return row?.count ?? 0;
  },
  ["job-count"],
  { revalidate: 120, tags: ["job-pool"] },
);

export function countJobs() {
  return loadJobCount();
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
