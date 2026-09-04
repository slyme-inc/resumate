import { getDb } from "@/lib/db";
import { fundingRound, ossRepo } from "@/lib/db/schema";
import { and, asc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { unstable_cache } from "next/cache";

export type OssRepoItem = {
  id: string;
  company: string;
  ycSlug: string | null;
  ycBatch: string | null;
  industry: string | null;
  website: string | null;
  sourceUrl: string | null;
  repoUrl: string | null;
  fullName: string;
  description: string | null;
  stars: number | null;
  language: string | null;
  pushedAt: Date | null;
};

type CachedOssRepo = Omit<OssRepoItem, "pushedAt"> & {
  pushedAt: string | null;
};

const PAGE_SIZE = 25;

function searchNeedle(query: string | null) {
  const needle = query?.replace(/[%_]/g, "").trim() ?? "";
  return needle.length > 0 ? needle : null;
}

function asDate(value: Date | string | null): Date | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const REPO_COLUMNS = {
  id: ossRepo.id,
  company: ossRepo.company,
  ycSlug: ossRepo.ycSlug,
  ycBatch: fundingRound.ycBatch,
  industry: fundingRound.industry,
  website: fundingRound.website,
  sourceUrl: fundingRound.sourceUrl,
  repoUrl: ossRepo.repoUrl,
  fullName: ossRepo.fullName,
  description: ossRepo.description,
  stars: ossRepo.stars,
  language: ossRepo.language,
  pushedAt: ossRepo.pushedAt,
} as const;

function serializeRepo(row: {
  id: string;
  company: string | null;
  ycSlug: string | null;
  ycBatch: string | null;
  industry: string | null;
  website: string | null;
  sourceUrl: string | null;
  repoUrl: string | null;
  fullName: string | null;
  description: string | null;
  stars: number | null;
  language: string | null;
  pushedAt: Date | string | null;
}): CachedOssRepo {
  const pushed = asDate(row.pushedAt);
  return {
    id: row.id,
    company: row.company?.trim() || "Unknown company",
    ycSlug: row.ycSlug,
    ycBatch: row.ycBatch,
    industry: row.industry,
    website: row.website,
    sourceUrl: row.sourceUrl,
    repoUrl: row.repoUrl,
    fullName: row.fullName?.trim() || row.id,
    description: row.description,
    stars: row.stars,
    language: row.language,
    pushedAt: pushed ? pushed.toISOString() : null,
  };
}

function reviveRepo(row: CachedOssRepo): OssRepoItem {
  return {
    ...row,
    pushedAt: asDate(row.pushedAt),
  };
}

function searchCondition(needle: string): SQL {
  const pattern = `%${needle}%`;
  return or(
    ilike(ossRepo.company, pattern),
    ilike(ossRepo.fullName, pattern),
    ilike(ossRepo.description, pattern),
    ilike(ossRepo.language, pattern),
  )!;
}

const SCORABLE = or(
  sql`${ossRepo.language} is not null and ${ossRepo.language} <> ''`,
  sql`${ossRepo.description} is not null and ${ossRepo.description} <> ''`,
)!;

const POOL_LIMIT = 400;

async function queryOssRepoPool(needle: string | null) {
  const conditions: SQL[] = needle ? [searchCondition(needle)] : [SCORABLE];
  const where = and(...conditions);

  const rows = await getDb()
    .select(REPO_COLUMNS)
    .from(ossRepo)
    .leftJoin(
      fundingRound,
      and(eq(fundingRound.source, "yc"), eq(fundingRound.ycSlug, ossRepo.ycSlug)),
    )
    .where(where)
    .orderBy(
      sql`${ossRepo.stars} desc nulls last`,
      sql`${ossRepo.pushedAt} desc nulls last`,
      asc(ossRepo.fullName),
    )
    .limit(POOL_LIMIT);

  return rows.map(serializeRepo);
}

const loadOssRepoPool = unstable_cache(queryOssRepoPool, ["oss-repo-pool"], {
  revalidate: 120,
  tags: ["oss-repos"],
});

export async function listOssRepoPool(options: { query?: string | null }) {
  const rows = await loadOssRepoPool(searchNeedle(options.query ?? null));
  return rows.map(reviveRepo);
}

async function queryOssRepo(id: string) {
  const needle = id.trim();
  if (!needle) {
    return null;
  }

  const [row] = await getDb()
    .select(REPO_COLUMNS)
    .from(ossRepo)
    .leftJoin(
      fundingRound,
      and(eq(fundingRound.source, "yc"), eq(fundingRound.ycSlug, ossRepo.ycSlug)),
    )
    .where(or(eq(ossRepo.id, needle), eq(ossRepo.fullName, needle)))
    .limit(1);

  return row ? serializeRepo(row) : null;
}

const loadOssRepo = unstable_cache(queryOssRepo, ["oss-repo"], {
  revalidate: 120,
  tags: ["oss-repos"],
});

export async function getOssRepo(id: string) {
  const row = await loadOssRepo(id);
  return row ? reviveRepo(row) : null;
}

export { PAGE_SIZE as OSS_REPO_PAGE_SIZE };
