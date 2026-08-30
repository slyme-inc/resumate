import { getDb } from "@/lib/db";
import { opportunityInsight } from "@/lib/db/schema";
import { isOpportunityInsight, type OpportunityInsight } from "@/lib/ai/types";
import { and, eq } from "drizzle-orm";

export async function getInsight(userId: string, source: string, id: string, profileFp: string) {
  const [row] = await getDb()
    .select()
    .from(opportunityInsight)
    .where(
      and(
        eq(opportunityInsight.userId, userId),
        eq(opportunityInsight.jobSource, source),
        eq(opportunityInsight.jobId, id),
      ),
    )
    .limit(1);

  if (!row || row.profileFp !== profileFp || !isOpportunityInsight(row.insight)) {
    return null;
  }

  return row.insight;
}

export async function saveInsight(
  userId: string,
  source: string,
  id: string,
  profileFp: string,
  insight: OpportunityInsight,
) {
  await getDb()
    .insert(opportunityInsight)
    .values({
      userId,
      jobSource: source,
      jobId: id,
      profileFp,
      insight,
    })
    .onConflictDoUpdate({
      target: [opportunityInsight.userId, opportunityInsight.jobSource, opportunityInsight.jobId],
      set: { profileFp, insight, createdAt: new Date() },
    });
}
