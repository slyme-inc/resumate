import { generateJson } from "@/lib/ai/gemini";
import type { FitJudgement } from "@/lib/matching/judgement";
import { jobKey, type NormalizedJob } from "@/lib/matching/job";
import { roleCardSummary } from "@/lib/matching/role-card";
import type { MatchResult } from "@/lib/matching/score";
import type { CandidateProfile } from "@/lib/profile/types";

const RERANK_LIMIT = 8;

type RankedJob = {
  key: string;
  job: NormalizedJob;
  match: MatchResult;
};

function clip(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function candidateCard(profile: CandidateProfile) {
  return {
    roles: profile.roles,
    seniority: profile.seniority,
    years: profile.yearsOfExperience,
    location: profile.location,
    primarySkills: profile.primarySkills.map((skill) => skill.label),
    secondarySkills: profile.secondarySkills.slice(0, 8).map((skill) => skill.label),
    titles: profile.titles.slice(0, 6),
  };
}

function jobCard(item: RankedJob) {
  return {
    key: jobKey(item.job.source, item.job.id),
    title: item.job.position,
    company: item.job.company,
    seniority: item.job.seniority,
    years: item.job.requiredYears,
    workMode: item.job.workMode,
    location: item.job.location,
    ...roleCardSummary(item.job.roleCard),
    heuristicScore: item.match.score,
  };
}

export async function rerankShortlist(
  profile: CandidateProfile,
  ranked: RankedJob[],
): Promise<FitJudgement[]> {
  const shortlist = ranked.slice(0, RERANK_LIMIT);
  if (shortlist.length === 0) {
    return [];
  }

  const payload = await generateJson<{ judgements?: FitJudgement[] }>(
    `You compare one candidate to ${shortlist.length} jobs. Return JSON only.

Hard rules:
- Use only skills listed on the candidate card. Never invent skills.
- mustHaveFailed = required skills on the job card the candidate does not have.
- mustHavePassed = required skills the candidate does have.
- niceToHavePassed = preferred/stack skills the candidate has.
- veto: a hard constraint the candidate clearly fails (on-site city mismatch, clearance, visa, PhD). Null otherwise.
- levelFit: match | stretch | overqualified | under
- key MUST be copied verbatim from each job card.

JSON shape:
{ "judgements": [{ "key": string, "mustHavePassed": string[], "mustHaveFailed": string[], "niceToHavePassed": string[], "levelFit": "match" | "stretch" | "overqualified" | "under", "veto": string | null }] }

Candidate:
${JSON.stringify(candidateCard(profile))}

Jobs:
${clip(JSON.stringify(shortlist.map(jobCard)), 5_000)}
`,
    { deadlineMs: 12_000 },
  );

  const allowed = new Set(shortlist.map((item) => item.key));
  return (payload.judgements ?? []).filter((row) => allowed.has(row.key));
}

export { RERANK_LIMIT };
