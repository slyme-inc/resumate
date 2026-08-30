import { getDb } from "@/lib/db";
import { fundingRound, job } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

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
      .where(eq(job.ycSlug, ycSlug));
    if ((bySlug?.count ?? 0) > 0) {
      return bySlug.count;
    }
  }

  const [byName] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(job)
    .where(sql`lower(trim(${job.company})) = ${company.trim().toLowerCase()}`);

  return byName?.count ?? 0;
}
