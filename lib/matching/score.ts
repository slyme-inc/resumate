import type { CandidateProfile } from "@/lib/profile/types";
import type { NormalizedJob } from "./job";
import type { FitJudgement } from "./judgement";
import { extractSkills } from "./extract";
import { normalizeForMatch } from "./text";
import {
  ROLE_LABELS,
  SENIORITY_LABELS,
  SENIORITY_RANK,
  skillLabel,
  type RoleFamily,
} from "./taxonomy";

/**
 * Must-haves dominate. A posting you fail half the requirements of cannot
 * look like a 90 because the title shares a couple of tokens.
 */
export const WEIGHTS = {
  mustHave: 0.4,
  stack: 0.18,
  role: 0.16,
  seniority: 0.12,
  experience: 0.09,
  location: 0.05,
} as const;

export type DimensionKey = keyof typeof WEIGHTS;

export type MatchDimension = {
  key: DimensionKey;
  label: string;
  score: number;
  weight: number;
  detail: string;
};

export type GapSeverity = "minor" | "moderate" | "significant";

export type SkillGap = {
  id: string;
  label: string;
  severity: GapSeverity;
};

export type MatchResult = {
  score: number;
  dimensions: MatchDimension[];
  matchedSkills: string[];
  missingSkills: SkillGap[];
  summary: string;
};

const RELATED_ROLES: Partial<Record<RoleFamily, RoleFamily[]>> = {
  fullstack: ["frontend", "backend"],
  frontend: ["fullstack"],
  backend: ["fullstack", "devops", "data"],
  mobile: ["frontend", "fullstack"],
  data: ["backend", "ml"],
  ml: ["data", "backend"],
  devops: ["backend"],
  qa: ["backend", "frontend"],
};

function unique(ids: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function labelsToIds(labels: string[]) {
  const ids: string[] = [];
  for (const label of labels) {
    const extracted = extractSkills(label, true);
    if (extracted.size > 0) {
      ids.push(...extracted.keys());
    } else if (label.trim()) {
      ids.push(`other:${label.trim().toLowerCase()}`);
    }
  }
  return unique(ids);
}

function candidateHas(candidate: CandidateProfile, skillId: string) {
  if (candidate.skillIds.has(skillId)) {
    return true;
  }
  const needle = normalizeForMatch(skillLabel(skillId));
  if (needle.length < 3) {
    return false;
  }
  return candidate.skills.some((skill) => {
    const label = normalizeForMatch(skill.label);
    return label === needle || (needle.length >= 4 && (label.includes(needle) || needle.includes(label)));
  });
}

function openVocabHits(candidate: CandidateProfile, haystack: string) {
  const hits: string[] = [];
  for (const skill of candidate.skills) {
    if (!skill.id.startsWith("other:")) continue;
    const needle = normalizeForMatch(skill.label);
    if (needle.length >= 3 && haystack.includes(needle)) {
      hits.push(skill.id);
    }
  }
  return hits;
}

function roleScore(candidateRoles: RoleFamily[], jobRole: RoleFamily) {
  if (candidateRoles.length === 0) {
    return { score: 0.5, detail: "Role could not be determined confidently." };
  }
  if (jobRole === "other") {
    return { score: 0.55, detail: "The posting does not name a clear engineering track." };
  }
  if (candidateRoles[0] === jobRole) {
    return { score: 1, detail: `Matches your primary focus, ${ROLE_LABELS[jobRole]}.` };
  }
  if (candidateRoles.includes(jobRole)) {
    return { score: 0.85, detail: `Overlaps a secondary focus, ${ROLE_LABELS[jobRole]}.` };
  }
  const related = candidateRoles.some((role) => RELATED_ROLES[role]?.includes(jobRole));
  if (related) {
    return { score: 0.65, detail: `Adjacent to your background in ${ROLE_LABELS[candidateRoles[0]]}.` };
  }
  return { score: 0.25, detail: `${ROLE_LABELS[jobRole]} sits outside your current track.` };
}

function seniorityScore(candidate: CandidateProfile, job: NormalizedJob) {
  const distance = SENIORITY_RANK[job.seniority] - SENIORITY_RANK[candidate.seniority];
  const magnitude = Math.abs(distance);

  if (distance === 0) {
    return { score: 1, detail: `Level matches your ${SENIORITY_LABELS[candidate.seniority]} profile.` };
  }

  if (distance > 0) {
    const score = Math.max(0, 1 - magnitude * 0.3);
    return {
      score,
      detail: `${SENIORITY_LABELS[job.seniority]} is ${magnitude} step${magnitude > 1 ? "s" : ""} above your ${SENIORITY_LABELS[candidate.seniority]} profile.`,
    };
  }

  const score = Math.max(0.55, 1 - magnitude * 0.15);
  return {
    score,
    detail: `${SENIORITY_LABELS[job.seniority]} is ${magnitude} step${magnitude > 1 ? "s" : ""} below your ${SENIORITY_LABELS[candidate.seniority]} profile.`,
  };
}

function experienceScore(candidate: CandidateProfile, job: NormalizedJob) {
  if (job.requiredYears === null) {
    return { score: 0.65, detail: "The posting does not state a years-of-experience bar." };
  }
  if (candidate.yearsOfExperience === null) {
    return { score: 0.5, detail: `Asks for ${job.requiredYears}+ years; we could not read yours from the résumé.` };
  }
  if (candidate.yearsOfExperience >= job.requiredYears) {
    return {
      score: 1,
      detail: `Asks for ${job.requiredYears}+ years and you have about ${candidate.yearsOfExperience}.`,
    };
  }
  const ratio = candidate.yearsOfExperience / Math.max(job.requiredYears, 1);
  return {
    score: Math.max(0.15, ratio),
    detail: `Asks for ${job.requiredYears}+ years; your résumé reads as about ${candidate.yearsOfExperience}.`,
  };
}

function locationScore(candidate: CandidateProfile, job: NormalizedJob) {
  if (job.workMode === "remote") {
    return { score: 1, detail: "Remote, so your location is not a constraint." };
  }
  if (job.workMode === "hybrid") {
    return { score: 0.7, detail: `Hybrid${job.location ? ` in ${job.location}` : ""}.` };
  }

  const candidateLocation = normalizeForMatch(candidate.location ?? "");
  const jobLocation = normalizeForMatch(job.location ?? "");
  if (!candidateLocation || !jobLocation) {
    return { score: 0.5, detail: job.location ? `On-site in ${job.location}.` : "Location not stated." };
  }

  const candidateTokens = new Set(candidateLocation.split(" ").filter((token) => token.length > 2));
  const overlap = jobLocation
    .split(" ")
    .filter((token) => token.length > 2)
    .some((token) => candidateTokens.has(token));

  return overlap
    ? { score: 1, detail: `On-site in ${job.location}, which matches your location.` }
    : { score: 0.25, detail: `On-site in ${job.location}, away from your stated location.` };
}

function compose(dimensions: MatchDimension[], caps: { failMustHaves: boolean; veto: boolean; strongFit: boolean }) {
  const total = dimensions.reduce((sum, dimension) => sum + dimension.score * dimension.weight, 0);
  const weightSum = dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
  let score = total / weightSum;

  if (caps.veto) {
    score = Math.min(score, 0.4);
  } else if (caps.failMustHaves) {
    score = Math.min(score, 0.58);
  } else if (caps.strongFit) {
    score = Math.max(score, 0.72);
  }

  return Math.round(score * 100);
}

function buildSummary(
  job: NormalizedJob,
  matchedSkills: string[],
  missingMust: string[],
  roleFit: number,
) {
  const rolePhrase = job.role === "other" ? "this role" : ROLE_LABELS[job.role].toLowerCase();
  const top = matchedSkills.slice(0, 3).map(skillLabel);

  if (missingMust.length >= 2) {
    const gaps = missingMust.slice(0, 2).map(skillLabel).join(" and ");
    return `The ${rolePhrase} track is in range, but the posting requires ${gaps}, which do not appear on your profile.`;
  }

  if (top.length === 0) {
    return roleFit >= 0.6
      ? `The ${rolePhrase} direction fits your background, though the posting's named technologies do not appear on your profile.`
      : `Little overlap with your profile, in both the ${rolePhrase} focus and the technologies named.`;
  }

  const list =
    top.length === 1 ? top[0] : `${top.slice(0, -1).join(", ")} and ${top[top.length - 1]}`;

  if (missingMust.length === 1) {
    return `Your ${list} experience lines up with ${job.company}, with a gap on ${skillLabel(missingMust[0])}.`;
  }

  return `Your ${list} experience lines up with what ${job.company} is asking for in this ${rolePhrase} role.`;
}

export function scoreJob(
  candidate: CandidateProfile,
  job: NormalizedJob,
  judgement?: FitJudgement | null,
): MatchResult {
  const haystack = normalizeForMatch(`${job.position} ${job.tags.join(" ")} ${job.description}`);
  const card = job.roleCard;

  const judgedMustPass = judgement?.mustHavePassed ? labelsToIds(judgement.mustHavePassed) : null;
  const judgedMustFail = judgement?.mustHaveFailed ? labelsToIds(judgement.mustHaveFailed) : null;

  const mustHave = unique(card.mustHave);
  const niceToHave = unique(card.niceToHave.filter((id) => !mustHave.includes(id)));

  const mustPassed = mustHave.filter((id) =>
    judgedMustFail?.includes(id) ? false : judgedMustPass?.includes(id) || candidateHas(candidate, id),
  );
  const mustFailed = [
    ...mustHave.filter((id) => !mustPassed.includes(id)),
    ...(judgedMustFail ?? []).filter((id) => !mustHave.includes(id) && !candidateHas(candidate, id)),
  ];

  const extraHits = openVocabHits(candidate, haystack);
  const nicePassed = unique([
    ...niceToHave.filter((id) => candidateHas(candidate, id) || (judgement?.niceToHavePassed && labelsToIds(judgement.niceToHavePassed).includes(id))),
    ...extraHits,
  ]);

  const mustHaveDimension =
    mustHave.length === 0
      ? { score: 0.7, detail: "The posting does not state clear required technologies." }
      : {
          score: mustPassed.length / mustHave.length,
          detail:
            mustFailed.length === 0
              ? `You cover the required stack (${mustPassed.slice(0, 4).map(skillLabel).join(", ")}).`
              : `You cover ${mustPassed.length} of ${mustHave.length} required technologies. Missing ${mustFailed.slice(0, 3).map(skillLabel).join(", ")}.`,
        };

  const stackPool = unique([...niceToHave, ...mustHave, ...candidate.primarySkills.map((skill) => skill.id)]);
  const stackHits = stackPool.filter((id) => candidateHas(candidate, id) && (mustHave.includes(id) || niceToHave.includes(id) || job.skillCounts.has(id)));
  const primaryHits = candidate.primarySkills.filter((skill) => mustHave.includes(skill.id) || niceToHave.includes(skill.id) || job.skillCounts.has(skill.id) || extraHits.includes(skill.id));

  const stackDimension =
    stackPool.length === 0
      ? { score: 0.5, detail: "Neither side names a clear technology stack." }
      : {
          score: Math.min(1, (stackHits.length + extraHits.length) / Math.min(Math.max(niceToHave.length, 1) + Math.min(mustHave.length, 3), 8)),
          detail:
            primaryHits.length > 0
              ? `Uses ${primaryHits.slice(0, 4).map((skill) => skill.label).join(", ")} from your core stack.`
              : "Does not lean on your strongest technologies.",
        };

  const role = roleScore(candidate.roles, job.role);
  const seniority = seniorityScore(candidate, job);
  const experience = experienceScore(candidate, job);
  const location = locationScore(candidate, job);

  const dimensions: MatchDimension[] = [
    { key: "mustHave", label: "Required skills", weight: WEIGHTS.mustHave, ...mustHaveDimension },
    { key: "stack", label: "Stack overlap", weight: WEIGHTS.stack, ...stackDimension },
    { key: "role", label: "Role alignment", weight: WEIGHTS.role, ...role },
    { key: "seniority", label: "Seniority", weight: WEIGHTS.seniority, ...seniority },
    { key: "experience", label: "Experience", weight: WEIGHTS.experience, ...experience },
    { key: "location", label: "Location", weight: WEIGHTS.location, ...location },
  ];

  const veto = Boolean(judgement?.veto);
  const failMustHaves = mustHave.length >= 2 && mustPassed.length / mustHave.length <= 0.5;
  const strongFit =
    !veto &&
    !failMustHaves &&
    mustHave.length > 0 &&
    mustFailed.length === 0 &&
    role.score >= 0.8 &&
    seniority.score >= 0.75;

  const matchedSkills = unique([...mustPassed, ...nicePassed]).slice(0, 12);
  const missingSkills: SkillGap[] = unique([...mustFailed, ...niceToHave.filter((id) => !nicePassed.includes(id))])
    .slice(0, 8)
    .map((id) => ({
      id,
      label: skillLabel(id),
      severity: (mustFailed.includes(id) ? "significant" : "moderate") as GapSeverity,
    }));

  return {
    score: compose(dimensions, { failMustHaves, veto, strongFit }),
    dimensions,
    matchedSkills,
    missingSkills,
    summary: buildSummary(job, matchedSkills, mustFailed, role.score),
  };
}
