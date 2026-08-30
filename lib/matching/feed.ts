import { fetchJobPool, type JobPoolOptions } from "@/lib/db/jobs";
import { getUserResumeAndProfile } from "@/lib/db/profile";
import { deriveCandidateProfile } from "@/lib/profile/derive";
import { toCandidateProfile } from "@/lib/profile/hydrate";
import type { CandidateProfile } from "@/lib/profile/types";
import type { WorkMode } from "./extract";
import { jobKey, normalizeJob, type JobRow, type NormalizedJob } from "./job";
import { scoreJob, type MatchResult } from "./score";
import type { SeniorityLevel } from "./taxonomy";

export type ScoredJob = {
  key: string;
  job: NormalizedJob;
  match: MatchResult;
  saved: boolean;
};

export type FeedFilters = {
  query?: string | null;
  source?: string | null;
  workMode?: WorkMode | null;
  seniority?: SeniorityLevel | null;
  minScore?: number | null;
};

export async function loadCandidateProfile(userId: string): Promise<CandidateProfile | null> {
  const { resume, profile } = await getUserResumeAndProfile(userId);
  if (!resume) {
    return null;
  }
  return profile ? toCandidateProfile(profile, resume) : deriveCandidateProfile(resume);
}

export function scoreAndRank(
  rows: JobRow[],
  profile: CandidateProfile,
  savedKeys: Set<string>,
  filters: FeedFilters = {},
): ScoredJob[] {
  const scored: ScoredJob[] = [];

  for (const row of rows) {
    const normalized = normalizeJob(row);

    // Work mode and seniority are derived in JS, so they are filtered after
    // normalization rather than in SQL.
    if (filters.workMode && normalized.workMode !== filters.workMode) {
      continue;
    }
    if (filters.seniority && normalized.seniority !== filters.seniority) {
      continue;
    }

    const match = scoreJob(profile, normalized);
    if (filters.minScore != null && match.score < filters.minScore) {
      continue;
    }

    scored.push({
      key: jobKey(normalized.source, normalized.id),
      job: normalized,
      match,
      saved: savedKeys.has(jobKey(normalized.source, normalized.id)),
    });
  }

  return scored.sort(
    (a, b) =>
      b.match.score - a.match.score ||
      (b.job.date?.getTime() ?? 0) - (a.job.date?.getTime() ?? 0),
  );
}

/**
 * Bias the SQL prefilter toward the candidate's strongest technologies so the
 * bounded pool is already relevant before scoring narrows it further.
 */
export function poolOptionsFor(
  profile: CandidateProfile,
  filters: FeedFilters,
): JobPoolOptions {
  return {
    query: filters.query ?? null,
    source: filters.source ?? null,
    skillTerms: profile.primarySkills.slice(0, 8).map((skill) => skill.label),
    limit: 400,
  };
}

export function countPostedWithin(results: ScoredJob[], days: number) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return results.filter((item) => (item.job.date?.getTime() ?? 0) >= cutoff).length;
}

export async function loadFeed(
  profile: CandidateProfile,
  savedKeys: Set<string>,
  filters: FeedFilters,
) {
  const rows = await fetchJobPool(poolOptionsFor(profile, filters));
  return scoreAndRank(rows, profile, savedKeys, filters);
}
