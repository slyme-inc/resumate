import { createHash } from "node:crypto";
import { rerankShortlist, RERANK_LIMIT } from "@/lib/ai/rerank";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { fetchJobPool, type JobPoolOptions } from "@/lib/db/jobs";
import { getUserResumeAndProfile } from "@/lib/db/profile";
import { getRerankJudgements, mergeRerankJudgements } from "@/lib/db/rerank";
import { deriveCandidateProfile } from "@/lib/profile/derive";
import { toCandidateProfile } from "@/lib/profile/hydrate";
import type { CandidateProfile } from "@/lib/profile/types";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { after } from "next/server";
import type { WorkMode } from "./extract";
import type { FitJudgement } from "./judgement";
import { jobKey, normalizeJob, type JobScoreRow, type NormalizedJob } from "./job";
import { scoreJob, type MatchResult } from "./score";
import { ROLE_LABELS, type RoleFamily, type SeniorityLevel } from "./taxonomy";

export type ScoredJob = {
  key: string;
  job: NormalizedJob;
  match: MatchResult;
  saved: boolean;
};

/** Fields the jobs list actually renders. Safe to JSON-cache. */
export type JobListItem = {
  key: string;
  saved: boolean;
  match: {
    score: number;
    summary: string;
    matchedSkills: string[];
  };
  job: {
    source: string;
    id: string;
    company: string;
    position: string;
    location: string | null;
    workMode: WorkMode;
    seniority: SeniorityLevel;
    date: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
  };
};

export type FeedFilters = {
  query?: string | null;
  source?: string | null;
  workMode?: WorkMode | null;
  seniority?: SeniorityLevel | null;
  minScore?: number | null;
};

const NONE_SAVED = new Set<string>();

export function feedCacheTag(userId: string) {
  return `feed:${userId}`;
}

export async function loadCandidateProfile(userId: string): Promise<CandidateProfile | null> {
  const { resume, profile } = await getUserResumeAndProfile(userId);
  if (!resume) {
    return null;
  }
  return profile ? toCandidateProfile(profile, resume) : deriveCandidateProfile(resume);
}

export function fingerprintCandidate(profile: CandidateProfile) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        skills: [...profile.skillIds].sort(),
        roles: profile.roles,
        seniority: profile.seniority,
        years: profile.yearsOfExperience,
        location: profile.location,
      }),
    )
    .digest("hex")
    .slice(0, 16);
}

function filterCacheKey(filters: FeedFilters) {
  return JSON.stringify({
    query: filters.query ?? null,
    source: filters.source ?? null,
    workMode: filters.workMode ?? null,
    seniority: filters.seniority ?? null,
    minScore: filters.minScore ?? null,
  });
}

function applyJudgements(results: ScoredJob[], profile: CandidateProfile, judgements: FitJudgement[]) {
  const byKey = new Map(judgements.map((row) => [row.key, row]));
  return results
    .map((item) => {
      const judgement = byKey.get(item.key);
      if (!judgement) {
        return item;
      }
      return {
        ...item,
        match: scoreJob(profile, item.job, judgement),
      };
    })
    .sort(
      (a, b) =>
        b.match.score - a.match.score ||
        (b.job.date?.getTime() ?? 0) - (a.job.date?.getTime() ?? 0),
    );
}

export function scoreAndRank(
  rows: JobScoreRow[],
  profile: CandidateProfile,
  savedKeys: Set<string>,
  filters: FeedFilters = {},
): ScoredJob[] {
  const scored: ScoredJob[] = [];

  for (const row of rows) {
    const normalized = normalizeJob(row);

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

const ROLE_SEARCH: Partial<Record<RoleFamily, string[]>> = {
  frontend: ["frontend", "front-end"],
  backend: ["backend", "back-end"],
  fullstack: ["full stack", "fullstack"],
  mobile: ["mobile", "react native"],
  data: ["data engineer", "data scientist"],
  ml: ["machine learning", "ml engineer"],
  devops: ["devops", "sre"],
  qa: ["qa engineer", "sdet"],
  security: ["security engineer"],
  product: ["product manager"],
  design: ["product designer"],
};

export function poolOptionsFor(
  profile: CandidateProfile,
  filters: FeedFilters,
): JobPoolOptions {
  const roleTerms = profile.roles.flatMap((role) => ROLE_SEARCH[role] ?? [ROLE_LABELS[role]]);
  return {
    query: filters.query ?? null,
    source: filters.source ?? null,
    skillTerms: [
      ...profile.primarySkills.slice(0, 8).map((skill) => skill.label),
      ...profile.secondarySkills.slice(0, 4).map((skill) => skill.label),
      ...roleTerms.slice(0, 4),
    ],
    limit: 200,
  };
}

export function countPostedWithin(results: ScoredJob[], days: number) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return results.filter((item) => (item.job.date?.getTime() ?? 0) >= cutoff).length;
}

function toListItem(item: ScoredJob): JobListItem {
  return {
    key: item.key,
    saved: false,
    match: {
      score: item.match.score,
      summary: item.match.summary,
      matchedSkills: item.match.matchedSkills,
    },
    job: {
      source: item.job.source,
      id: item.job.id,
      company: item.job.company,
      position: item.job.position,
      location: item.job.location,
      workMode: item.job.workMode,
      seniority: item.job.seniority,
      date: item.job.date ? item.job.date.toISOString() : null,
      salaryMin: item.job.salaryMin,
      salaryMax: item.job.salaryMax,
    },
  };
}

async function fillMissingJudgements(
  profile: CandidateProfile,
  missing: ScoredJob[],
  userId: string,
  profileFp: string,
) {
  try {
    const judgements = await rerankShortlist(profile, missing);
    if (judgements.length === 0) {
      return;
    }
    await mergeRerankJudgements(userId, profileFp, judgements);
    revalidateTag(feedCacheTag(userId), "max");
  } catch (error) {
    console.error("Gemini rerank failed; using composed heuristic scores.", error);
  }
}

async function getCachedRankedFeed(
  userId: string,
  profileFp: string,
  filterKey: string,
): Promise<{ cards: JobListItem[]; pendingKeys: string[] }> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });
  cacheTag("job-pool", feedCacheTag(userId));

  const profile = await loadCandidateProfile(userId);
  if (!profile || fingerprintCandidate(profile) !== profileFp) {
    return { cards: [], pendingKeys: [] };
  }

  const filters = JSON.parse(filterKey) as FeedFilters;
  const rows = await fetchJobPool(poolOptionsFor(profile, filters));
  const ranked = scoreAndRank(rows, profile, NONE_SAVED, filters);

  let applied = ranked;
  let pendingKeys: string[] = [];

  if (isGeminiConfigured() && ranked.length > 0) {
    const cached = await getRerankJudgements(userId, profileFp);
    const known = new Set(cached.map((row) => row.key));
    if (cached.length > 0) {
      applied = applyJudgements(ranked, profile, cached);
    }
    pendingKeys = applied
      .slice(0, RERANK_LIMIT)
      .filter((item) => !known.has(item.key))
      .map((item) => item.key);
  }

  return { cards: applied.map(toListItem), pendingKeys };
}

async function fillPendingFromPool(
  userId: string,
  profile: CandidateProfile,
  filters: FeedFilters,
  pendingKeys: string[],
) {
  const wanted = new Set(pendingKeys);
  const rows = await fetchJobPool(poolOptionsFor(profile, filters));
  const missing = scoreAndRank(rows, profile, NONE_SAVED, filters).filter((item) =>
    wanted.has(item.key),
  );
  if (missing.length === 0) {
    return;
  }
  await fillMissingJudgements(profile, missing, userId, fingerprintCandidate(profile));
}

export async function loadFeedList(
  userId: string,
  profile: CandidateProfile,
  savedKeys: Set<string>,
  filters: FeedFilters,
): Promise<{ items: JobListItem[]; total: number }> {
  const profileFp = fingerprintCandidate(profile);
  const { cards, pendingKeys } = await getCachedRankedFeed(
    userId,
    profileFp,
    filterCacheKey(filters),
  );

  if (pendingKeys.length > 0) {
    after(() => fillPendingFromPool(userId, profile, filters, pendingKeys));
  }

  return {
    items: cards.map((card) =>
      savedKeys.has(card.key) ? { ...card, saved: true } : card,
    ),
    total: cards.length,
  };
}

export async function loadFeed(
  profile: CandidateProfile,
  savedKeys: Set<string>,
  filters: FeedFilters,
  options?: { userId?: string },
) {
  const rows = await fetchJobPool(poolOptionsFor(profile, filters));
  const ranked = scoreAndRank(rows, profile, savedKeys, filters);
  if (!options?.userId || !isGeminiConfigured() || ranked.length === 0) {
    return ranked;
  }

  const profileFp = fingerprintCandidate(profile);
  try {
    const cached = await getRerankJudgements(options.userId, profileFp);
    return cached.length > 0 ? applyJudgements(ranked, profile, cached) : ranked;
  } catch (error) {
    console.error("Rerank cache read failed; using composed heuristic scores.", error);
    return ranked;
  }
}

/** Job cards never render the description; dropping it keeps the RSC payload small. */
export function withoutDescriptions<T extends ScoredJob>(results: T[]): T[] {
  return results.map((item) =>
    item.job.description
      ? { ...item, job: { ...item.job, description: "" } }
      : item,
  );
}
