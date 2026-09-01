"use server";

import { generateOpportunityInsight } from "@/lib/ai/opportunity";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { getInsight, saveInsight } from "@/lib/db/insight";
import { getJob } from "@/lib/db/jobs";
import { getUserResumeAndProfile } from "@/lib/db/profile";
import { getStoredRoleCard } from "@/lib/db/role-card";
import { normalizeJob } from "@/lib/matching/job";
import { scoreJob } from "@/lib/matching/score";
import { deriveCandidateProfile } from "@/lib/profile/derive";
import { fingerprintProfile, heuristicStoredProfile, toCandidateProfile } from "@/lib/profile/hydrate";
import type { OpportunityInsight } from "@/lib/ai/types";
import { createClient } from "@/lib/supabase/server";

export type InsightResult =
  | { ok: true; insight: OpportunityInsight; cached: boolean }
  | { ok: false; error: string };

export async function loadOpportunityInsightAction(
  source: string,
  id: string,
): Promise<InsightResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;

  if (!userId) {
    return { ok: false, error: "Sign in to generate advice." };
  }

  const [{ resume, profile: stored }, row, storedCard] = await Promise.all([
    getUserResumeAndProfile(userId),
    getJob(source, id),
    getStoredRoleCard(source, id),
  ]);

  if (!resume || !row) {
    return { ok: false, error: "Résumé or job is missing." };
  }

  const storedProfile = stored ?? heuristicStoredProfile(resume);
  const profile = stored ? toCandidateProfile(stored, resume) : deriveCandidateProfile(resume);
  const job = normalizeJob({ ...row, roleCard: storedCard });
  const match = scoreJob(profile, job);
  const profileFp = fingerprintProfile(storedProfile);

  const cached = await getInsight(userId, source, id, profileFp);
  if (cached) {
    return { ok: true, insight: cached, cached: true };
  }

  if (!isGeminiConfigured()) {
    return { ok: false, error: "Gemini is not configured." };
  }

  try {
    const insight = await generateOpportunityInsight({
      resume,
      stored: storedProfile,
      profile,
      job,
      match,
    });
    await saveInsight(userId, source, id, profileFp, insight);
    return { ok: true, insight, cached: false };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not generate advice for this role.",
    };
  }
}
