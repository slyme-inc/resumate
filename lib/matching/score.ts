import type { CandidateProfile } from "@/lib/profile/types";
import type { NormalizedJob } from "./job";
import { normalizeForMatch } from "./text";
import {
  ROLE_LABELS,
  SENIORITY_LABELS,
  SENIORITY_RANK,
  skillLabel,
  type RoleFamily,
} from "./taxonomy";

/**
 * Spec §40: a transparent weighted model. Weights live here so they can be
 * tuned in one place once real engagement data exists.
 */
export const WEIGHTS = {
  skills: 0.3,
  technology: 0.15,
  role: 0.2,
  seniority: 0.15,
  experience: 0.1,
  location: 0.1,
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

function roleScore(candidateRoles: RoleFamily[], jobRole: RoleFamily) {
  if (candidateRoles.length === 0 || jobRole === "other") {
    return { score: 0.5, detail: "Role could not be determined confidently." };
  }

  if (candidateRoles[0] === jobRole) {
    return { score: 1, detail: `Matches your primary focus, ${ROLE_LABELS[jobRole]}.` };
  }
  if (candidateRoles.includes(jobRole)) {
    return { score: 0.8, detail: `Overlaps a secondary focus, ${ROLE_LABELS[jobRole]}.` };
  }

  const related = candidateRoles.some((role) => RELATED_ROLES[role]?.includes(jobRole));
  if (related) {
    return { score: 0.6, detail: `Adjacent to your background in ${ROLE_LABELS[candidateRoles[0]]}.` };
  }

  return { score: 0.25, detail: `${ROLE_LABELS[jobRole]} sits outside your current track.` };
}

function seniorityScore(candidate: CandidateProfile, job: NormalizedJob) {
  const distance = SENIORITY_RANK[job.seniority] - SENIORITY_RANK[candidate.seniority];
  const magnitude = Math.abs(distance);
  const score = Math.max(0, 1 - magnitude * 0.25);

  if (distance === 0) {
    return { score, detail: `Level matches your ${SENIORITY_LABELS[candidate.seniority]} profile.` };
  }
  const direction = distance > 0 ? "above" : "below";
  return {
    score,
    detail: `${SENIORITY_LABELS[job.seniority]} is ${magnitude} step${magnitude > 1 ? "s" : ""} ${direction} your ${SENIORITY_LABELS[candidate.seniority]} profile.`,
  };
}

function experienceScore(candidate: CandidateProfile, job: NormalizedJob) {
  if (job.requiredYears === null) {
    return { score: 0.6, detail: "The posting does not state a years-of-experience bar." };
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
    return { score: 0.6, detail: `Hybrid${job.location ? ` in ${job.location}` : ""}.` };
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
    : { score: 0.3, detail: `On-site in ${job.location}, away from your stated location.` };
}

function severityFor(importance: number, max: number): GapSeverity {
  const ratio = max > 0 ? importance / max : 0;
  if (ratio >= 0.6) return "significant";
  if (ratio >= 0.25) return "moderate";
  return "minor";
}

export function scoreJob(candidate: CandidateProfile, job: NormalizedJob): MatchResult {
  const jobSkills = [...job.skillCounts.entries()];
  const totalImportance = jobSkills.reduce((sum, [, count]) => sum + count, 0);
  const maxImportance = jobSkills.reduce((max, [, count]) => Math.max(max, count), 0);

  const matched = jobSkills.filter(([id]) => candidate.skillIds.has(id));
  const missing = jobSkills.filter(([id]) => !candidate.skillIds.has(id));
  const matchedImportance = matched.reduce((sum, [, count]) => sum + count, 0);

  const skills =
    totalImportance > 0
      ? {
          score: matchedImportance / totalImportance,
          detail:
            matched.length > 0
              ? `You cover ${matched.length} of ${jobSkills.length} technologies named in the posting.`
              : "None of the technologies named in the posting appear on your résumé.",
        }
      : { score: 0.5, detail: "The posting does not name specific technologies." };

  const primaryIds = new Set(candidate.primarySkills.map((skill) => skill.id));
  const primaryHits = [...primaryIds].filter((id) => job.skillCounts.has(id));
  const technology =
    primaryIds.size > 0
      ? {
          score: Math.min(1, primaryHits.length / Math.min(primaryIds.size, 5)),
          detail:
            primaryHits.length > 0
              ? `Uses ${primaryHits.map(skillLabel).join(", ")} from your core stack.`
              : "Does not lean on your strongest technologies.",
        }
      : { score: 0.5, detail: "Your résumé does not show a clear core stack yet." };

  const role = roleScore(candidate.roles, job.role);
  const seniority = seniorityScore(candidate, job);
  const experience = experienceScore(candidate, job);
  const location = locationScore(candidate, job);

  const dimensions: MatchDimension[] = [
    { key: "skills", label: "Skills", weight: WEIGHTS.skills, ...skills },
    { key: "technology", label: "Technology", weight: WEIGHTS.technology, ...technology },
    { key: "role", label: "Role alignment", weight: WEIGHTS.role, ...role },
    { key: "seniority", label: "Seniority", weight: WEIGHTS.seniority, ...seniority },
    { key: "experience", label: "Experience", weight: WEIGHTS.experience, ...experience },
    { key: "location", label: "Location", weight: WEIGHTS.location, ...location },
  ];

  const total = dimensions.reduce((sum, dimension) => sum + dimension.score * dimension.weight, 0);
  const weightSum = dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);

  const matchedSkills = matched
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  const missingSkills: SkillGap[] = missing
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, importance]) => ({
      id,
      label: skillLabel(id),
      severity: severityFor(importance, maxImportance),
    }));

  return {
    score: Math.round((total / weightSum) * 100),
    dimensions,
    matchedSkills,
    missingSkills,
    summary: buildSummary(job, matchedSkills, role.score),
  };
}

/**
 * Spec §45: state only what the data supports, and never imply a skill the
 * candidate has not demonstrated.
 */
function buildSummary(job: NormalizedJob, matchedSkills: string[], roleFit: number) {
  const top = matchedSkills.slice(0, 3).map(skillLabel);
  const rolePhrase = job.role === "other" ? "this role" : ROLE_LABELS[job.role].toLowerCase();

  if (top.length === 0) {
    return roleFit >= 0.6
      ? `The ${rolePhrase} direction fits your background, though the posting's named technologies do not appear on your résumé.`
      : `Little overlap with your résumé, in both the ${rolePhrase} focus and the technologies named.`;
  }

  const list =
    top.length === 1
      ? top[0]
      : `${top.slice(0, -1).join(", ")} and ${top[top.length - 1]}`;

  return `Your ${list} experience lines up with what ${job.company} is asking for in this ${rolePhrase} role.`;
}
