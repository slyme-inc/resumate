import { getDb } from "@/lib/db";
import { fundingRound, job } from "@/lib/db/schema";
import { CUSTOM_JOB_SOURCE } from "@/lib/matching/custom-job";
import { and, eq, ne, sql } from "drizzle-orm";

export type CompanyIntel = {
  company: string;
  website: string | null;
  industry: string | null;
  ycBatch: string | null;
  ycSlug: string | null;
  sourceUrl: string | null;
  amount: string | null;
  round: string | null;
  matchedBy: "yc_slug" | "unique_name";
};

export async function getCompanyIntel(
  company: string | null,
  ycSlug: string | null,
): Promise<CompanyIntel | null> {
  if (ycSlug) {
    const [row] = await getDb()
      .select()
      .from(fundingRound)
      .where(eq(fundingRound.ycSlug, ycSlug))
      .limit(1);
    if (row) {
      return {
        company: row.company ?? company ?? "Unknown company",
        website: row.website,
        industry: row.industry,
        ycBatch: row.ycBatch,
        ycSlug: row.ycSlug,
        sourceUrl: row.sourceUrl,
        amount: row.amount,
        round: row.round,
        matchedBy: "yc_slug",
      };
    }
  }

  if (!company?.trim()) {
    return null;
  }

  const rows = await getDb()
    .select()
    .from(fundingRound)
    .where(sql`lower(trim(${fundingRound.company})) = ${company.trim().toLowerCase()}`)
    .limit(2);

  if (rows.length !== 1) {
    return null;
  }

  const row = rows[0];
  return {
    company: row.company ?? company,
    website: row.website,
    industry: row.industry,
    ycBatch: row.ycBatch,
    ycSlug: row.ycSlug,
    sourceUrl: row.sourceUrl,
    amount: row.amount,
    round: row.round,
    matchedBy: "unique_name",
  };
}

export async function countOpenRoles(company: string, ycSlug: string | null) {
  if (ycSlug) {
    const [bySlug] = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(job)
      .where(and(eq(job.ycSlug, ycSlug), ne(job.source, CUSTOM_JOB_SOURCE)));
    if ((bySlug?.count ?? 0) > 0) {
      return bySlug.count;
    }
  }

  if (!company.trim()) {
    return 0;
  }

  const [byName] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(job)
    .where(and(eq(job.company, company), ne(job.source, CUSTOM_JOB_SOURCE)));

  return byName?.count ?? 0;
}
