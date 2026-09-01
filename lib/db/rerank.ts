import { getDb } from "@/lib/db";
import { matchRerank } from "@/lib/db/schema";
import {
  isFitJudgement,
  isRerankCache,
  type FitJudgement,
  type RerankCache,
} from "@/lib/matching/judgement";
import { and, eq } from "drizzle-orm";

const TTL_MS = 12 * 60 * 60 * 1000;

export async function getRerankJudgements(
  userId: string,
  profileFp: string,
): Promise<FitJudgement[]> {
  const [row] = await getDb()
    .select()
    .from(matchRerank)
    .where(and(eq(matchRerank.userId, userId), eq(matchRerank.profileFp, profileFp)))
    .limit(1);

  if (!row || !isRerankCache(row.payload)) {
    return [];
  }
  if (Date.now() - row.createdAt.getTime() > TTL_MS) {
    return [];
  }
  return row.payload.judgements.filter(isFitJudgement);
}

export async function mergeRerankJudgements(
  userId: string,
  profileFp: string,
  incoming: FitJudgement[],
) {
  const existing = await getRerankJudgements(userId, profileFp);
  const byKey = new Map<string, FitJudgement>();
  for (const row of existing) {
    byKey.set(row.key, row);
  }
  for (const row of incoming) {
    if (isFitJudgement(row)) {
      byKey.set(row.key, row);
    }
  }

  const judgements = [...byKey.values()];
  const payload: RerankCache = {
    version: 1,
    keys: judgements
      .map((row) => row.key)
      .sort()
      .join(","),
    judgements,
  };

  await getDb()
    .insert(matchRerank)
    .values({
      userId,
      profileFp,
      keys: payload.keys,
      payload,
    })
    .onConflictDoUpdate({
      target: [matchRerank.userId, matchRerank.profileFp],
      set: { keys: payload.keys, payload, createdAt: new Date() },
    });
}
