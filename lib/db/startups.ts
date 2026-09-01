import { getDb } from "@/lib/db";
import { fundingRound } from "@/lib/db/schema";
import { and, asc, desc, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm";
import { unstable_cache } from "next/cache";

export type StartupNewsKind = "funding" | "yc";

export type StartupNewsItem = {
  source: string;
  id: string;
  company: string;
  website: string | null;
  industry: string | null;
  country: string | null;
  amount: string | null;
  round: string | null;
  announcedAt: Date | null;
  sourceUrl: string | null;
  ycSlug: string | null;
  ycBatch: string | null;
  kind: StartupNewsKind;
};

export type YcBatchSummary = {
  ycBatch: string;
  companies: number;
  announcedAt: Date | null;
};

type CachedNewsItem = Omit<StartupNewsItem, "announcedAt"> & {
  announcedAt: string | null;
};

type CachedBatch = Omit<YcBatchSummary, "announcedAt"> & {
  announcedAt: string | null;
};

const PAGE_SIZE = 25;

/** YC directory rows from 2025 onward — older batches are not news. */
const RECENT_YC_BATCH = sql`${fundingRound.ycBatch} ~ '202[5-7]'`;
const YC_BATCH_YEAR = sql`coalesce(substring(${fundingRound.ycBatch} from '\\d{4}')::int, 0)`;
const YC_BATCH_SEASON = sql`
  case
    when ${fundingRound.ycBatch} ~* 'fall' then 4
    when ${fundingRound.ycBatch} ~* 'summer' then 3
    when ${fundingRound.ycBatch} ~* 'spring' then 2
    when ${fundingRound.ycBatch} ~* 'winter' then 1
    else 0
  end
`;

export function isRecentYcBatch(batch: string) {
  return /202[5-7]/.test(batch);
}

function searchNeedle(query: string | null) {
  const needle = query?.replace(/[%_]/g, "").trim() ?? "";
  return needle.length > 0 ? needle : null;
}

function searchCondition(needle: string): SQL {
  const pattern = `%${needle}%`;
  return or(ilike(fundingRound.company, pattern), ilike(fundingRound.industry, pattern))!;
}

function asDate(value: Date | string | null): Date | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function serializeItem(row: {
  source: string;
  id: string;
  company: string | null;
  website: string | null;
  industry: string | null;
  country: string | null;
  amount: string | null;
  round: string | null;
  announcedAt: Date | string | null;
  sourceUrl: string | null;
  ycSlug: string | null;
  ycBatch: string | null;
}): CachedNewsItem {
  const announced = asDate(row.announcedAt);
  return {
    source: row.source,
    id: row.id,
    company: row.company?.trim() || "Unknown company",
    website: row.website,
    industry: row.industry,
    country: row.country,
    amount: row.amount,
    round: row.round,
    announcedAt: announced ? announced.toISOString().slice(0, 10) : null,
    sourceUrl: row.sourceUrl,
    ycSlug: row.ycSlug,
    ycBatch: row.ycBatch,
    kind: row.source === "yc" || row.round === "yc" ? "yc" : "funding",
  };
}

function reviveItem(row: CachedNewsItem): StartupNewsItem {
  return {
    ...row,
    announcedAt: asDate(row.announcedAt),
  };
}

function reviveBatch(row: CachedBatch): YcBatchSummary {
  return {
    ...row,
    announcedAt: asDate(row.announcedAt),
  };
}

const newsColumns = {
  source: fundingRound.source,
  id: fundingRound.id,
  company: fundingRound.company,
  website: fundingRound.website,
  industry: fundingRound.industry,
  country: fundingRound.country,
  amount: fundingRound.amount,
  round: fundingRound.round,
  announcedAt: fundingRound.announcedAt,
  sourceUrl: fundingRound.sourceUrl,
  ycSlug: fundingRound.ycSlug,
  ycBatch: fundingRound.ycBatch,
};

async function queryPagedNews(
  conditions: SQL[],
  orderBy: SQL[],
  requestedPage: number,
  pageSize: number,
) {
  const where = and(...conditions);
  const [countRow] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(fundingRound)
    .where(where);
  const total = countRow?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const rows = await getDb()
    .select(newsColumns)
    .from(fundingRound)
    .where(where)
    .orderBy(...orderBy)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    items: rows.map(serializeItem),
    total,
    page,
  };
}

async function queryFundingNews(needle: string | null, page: number, pageSize: number) {
  const conditions: SQL[] = [ne(fundingRound.source, "yc")];
  if (needle) {
    conditions.push(searchCondition(needle));
  }
  return queryPagedNews(
    conditions,
    [desc(fundingRound.announcedAt), asc(fundingRound.company)],
    page,
    pageSize,
  );
}

async function queryRecentYcNews(needle: string | null, page: number, pageSize: number) {
  const conditions: SQL[] = [eq(fundingRound.source, "yc"), RECENT_YC_BATCH];
  if (needle) {
    conditions.push(searchCondition(needle));
  }
  return queryPagedNews(
    conditions,
    [desc(YC_BATCH_YEAR), desc(YC_BATCH_SEASON), asc(fundingRound.company)],
    page,
    pageSize,
  );
}

async function queryYcBatches(): Promise<CachedBatch[]> {
  const rows = await getDb()
    .select({
      ycBatch: fundingRound.ycBatch,
      companies: sql<number>`count(*)::int`,
      announcedAt: sql<Date | string | null>`min(${fundingRound.announcedAt})`,
    })
    .from(fundingRound)
    .where(and(eq(fundingRound.source, "yc"), RECENT_YC_BATCH))
    .groupBy(fundingRound.ycBatch)
    .orderBy(desc(YC_BATCH_YEAR), desc(YC_BATCH_SEASON), desc(fundingRound.ycBatch));

  return rows.flatMap((row) => {
    const ycBatch = row.ycBatch?.trim();
    if (!ycBatch) {
      return [];
    }
    const announced = asDate(row.announcedAt);
    return [
      {
        ycBatch,
        companies: row.companies,
        announcedAt: announced ? announced.toISOString().slice(0, 10) : null,
      },
    ];
  });
}

async function queryYcBatchCompanies(
  batch: string,
  needle: string | null,
  page: number,
  pageSize: number,
) {
  const conditions: SQL[] = [eq(fundingRound.source, "yc"), eq(fundingRound.ycBatch, batch)];
  if (needle) {
    conditions.push(searchCondition(needle));
  }
  return queryPagedNews(conditions, [asc(fundingRound.company)], page, pageSize);
}

const loadFundingNews = unstable_cache(
  queryFundingNews,
  ["startup-funding-news"],
  { revalidate: 120, tags: ["startup-news"] },
);

const loadYcBatches = unstable_cache(queryYcBatches, ["startup-yc-batches"], {
  revalidate: 120,
  tags: ["startup-news"],
});

const loadRecentYcNews = unstable_cache(queryRecentYcNews, ["startup-recent-yc-news"], {
  revalidate: 120,
  tags: ["startup-news"],
});

const loadYcBatchCompanies = unstable_cache(
  queryYcBatchCompanies,
  ["startup-yc-batch-companies"],
  { revalidate: 120, tags: ["startup-news"] },
);

function asPageResult(result: Awaited<ReturnType<typeof queryPagedNews>>) {
  return {
    items: result.items.map(reviveItem),
    total: result.total,
    page: result.page,
    pageSize: PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(result.total / PAGE_SIZE)),
  };
}

export async function listFundingNews(options: {
  query?: string | null;
  page?: number;
}) {
  return asPageResult(
    await loadFundingNews(searchNeedle(options.query ?? null), Math.max(1, options.page ?? 1), PAGE_SIZE),
  );
}

export async function listRecentYcNews(options: {
  query?: string | null;
  page?: number;
}) {
  return asPageResult(
    await loadRecentYcNews(searchNeedle(options.query ?? null), Math.max(1, options.page ?? 1), PAGE_SIZE),
  );
}

export async function listYcBatches() {
  const rows = await loadYcBatches();
  return rows.map(reviveBatch);
}

export async function listYcBatchCompanies(options: {
  batch: string;
  query?: string | null;
  page?: number;
}) {
  return asPageResult(
    await loadYcBatchCompanies(
      options.batch,
      searchNeedle(options.query ?? null),
      Math.max(1, options.page ?? 1),
      PAGE_SIZE,
    ),
  );
}

export { PAGE_SIZE as STARTUP_NEWS_PAGE_SIZE };
