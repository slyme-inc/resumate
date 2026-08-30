import { createHash } from "node:crypto";
import { extractSkills } from "@/lib/matching/extract";
import {
  ROLE_LABELS,
  SENIORITY_LABELS,
  SKILL_BY_ID,
  type RoleFamily,
  type SeniorityLevel,
  type SkillCategory,
} from "@/lib/matching/taxonomy";
import { deriveCandidateProfile } from "@/lib/profile/derive";
import type { StoredProfile, StoredSkill } from "@/lib/profile/stored";
import type { CandidateProfile, ProfileSkill } from "@/lib/profile/types";
import type { ParsedResume } from "@/lib/resume/types";

const ROLE_IDS = new Set<string>(Object.keys(ROLE_LABELS));
const SENIORITY_IDS = new Set<string>(Object.keys(SENIORITY_LABELS));

function asRole(value: string): RoleFamily | null {
  const id = value.trim().toLowerCase().replace(/[\s-]+/g, "");
  if (ROLE_IDS.has(value)) return value as RoleFamily;
  const aliases: Record<string, RoleFamily> = {
    frontend: "frontend",
    frontendengineering: "frontend",
    backend: "backend",
    backendengineering: "backend",
    fullstack: "fullstack",
    fullstackengineering: "fullstack",
    mobile: "mobile",
    mobileengineering: "mobile",
    data: "data",
    dataengineering: "data",
    ml: "ml",
    machinelearning: "ml",
    devops: "devops",
    qa: "qa",
    security: "security",
    product: "product",
    design: "design",
    other: "other",
  };
  return aliases[id] ?? null;
}

function asSeniority(value: string | null | undefined, fallback: SeniorityLevel): SeniorityLevel {
  if (!value) return fallback;
  const id = value.trim().toLowerCase();
  if (SENIORITY_IDS.has(id)) return id as SeniorityLevel;
  if (id.includes("intern")) return "intern";
  if (id.includes("junior") || id.includes("entry")) return "junior";
  if (id.includes("principal") || id.includes("staff+")) return "principal";
  if (id.includes("staff") || id.includes("lead")) return "staff";
  if (id.includes("senior") || id === "sr") return "senior";
  if (id.includes("mid")) return "mid";
  return fallback;
}

function unique(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function skillEntries(labels: string[], prominence: StoredSkill["prominence"]): StoredSkill[] {
  return unique(labels).map((label) => {
    const id = extractSkills(label, true).keys().next().value;
    const known = id ? SKILL_BY_ID.get(id) : undefined;
    return {
      label: known?.label ?? label,
      category: (known?.category ?? "other") as SkillCategory | "other",
      prominence,
    };
  });
}

export type ProfileDraft = {
  source: StoredProfile["source"];
  name?: string | null;
  headline?: string | null;
  location?: string | null;
  seniority?: string | null;
  yearsOfExperience?: number | null;
  roles?: string[];
  titles?: string[];
  primarySkills?: string[];
  secondarySkills?: string[];
  strengths?: string[];
  facts?: string[];
  inferences?: string[];
  industryInterests?: string[];
  startupSuitability?: string | null;
};

export function heuristicStoredProfile(resume: ParsedResume): StoredProfile {
  const derived = deriveCandidateProfile(resume);
  return {
    version: 1,
    source: "heuristic",
    name: derived.name,
    headline: derived.headline,
    location: derived.location,
    seniority: derived.seniority,
    yearsOfExperience: derived.yearsOfExperience,
    roles: derived.roles,
    titles: derived.titles,
    skills: [
      ...derived.primarySkills.map((skill) => ({
        label: skill.label,
        category: skill.category,
        prominence: "primary" as const,
      })),
      ...derived.secondarySkills.map((skill) => ({
        label: skill.label,
        category: skill.category,
        prominence: "secondary" as const,
      })),
    ],
    strengths: [],
    facts: [],
    inferences: [],
    industryInterests: [],
    startupSuitability: null,
    updatedAt: new Date().toISOString(),
  };
}

export function toStoredProfile(resume: ParsedResume, draft: ProfileDraft): StoredProfile {
  const fallback = heuristicStoredProfile(resume);
  const roles = unique(draft.roles ?? [])
    .map(asRole)
    .filter((role): role is RoleFamily => role !== null);

  const primary = skillEntries(draft.primarySkills ?? [], "primary");
  const primaryKeys = new Set(primary.map((skill) => skill.label.toLowerCase()));
  const secondary = skillEntries(draft.secondarySkills ?? [], "secondary").filter(
    (skill) => !primaryKeys.has(skill.label.toLowerCase()),
  );

  return {
    version: 1,
    source: draft.source,
    name: draft.name?.trim() || fallback.name,
    headline: draft.headline?.trim() || fallback.headline,
    location: draft.location?.trim() || fallback.location,
    seniority: asSeniority(draft.seniority, fallback.seniority),
    yearsOfExperience:
      typeof draft.yearsOfExperience === "number" && Number.isFinite(draft.yearsOfExperience)
        ? Math.max(0, Math.round(draft.yearsOfExperience))
        : fallback.yearsOfExperience,
    roles: roles.length > 0 ? roles.slice(0, 4) : fallback.roles,
    titles: unique(draft.titles ?? fallback.titles).slice(0, 8),
    skills: primary.length + secondary.length > 0 ? [...primary, ...secondary] : fallback.skills,
    strengths: unique(draft.strengths ?? []).slice(0, 8),
    facts: unique(draft.facts ?? []).slice(0, 10),
    inferences: unique(draft.inferences ?? []).slice(0, 10),
    industryInterests: unique(draft.industryInterests ?? []).slice(0, 8),
    startupSuitability: draft.startupSuitability?.trim() || null,
    updatedAt: new Date().toISOString(),
  };
}

export function toCandidateProfile(stored: StoredProfile, resume: ParsedResume): CandidateProfile {
  const derived = deriveCandidateProfile(resume);
  const labels = stored.skills.map((skill) => skill.label).join("\n");
  const counts = extractSkills(labels, true);
  const skills: ProfileSkill[] = [...counts.entries()]
    .map(([id, weight]) => {
      const skill = SKILL_BY_ID.get(id);
      return skill ? { id, label: skill.label, category: skill.category, weight } : null;
    })
    .filter((value): value is ProfileSkill => value !== null);

  const primaryLabels = new Set(
    stored.skills.filter((skill) => skill.prominence === "primary").map((skill) => skill.label.toLowerCase()),
  );
  const primarySkills = skills.filter((skill) => primaryLabels.has(skill.label.toLowerCase()));
  const secondarySkills = skills.filter((skill) => !primaryLabels.has(skill.label.toLowerCase()));

  return {
    name: stored.name ?? derived.name,
    headline: stored.headline ?? derived.headline,
    location: stored.location ?? derived.location,
    skills: skills.length > 0 ? skills : derived.skills,
    primarySkills: primarySkills.length > 0 ? primarySkills : derived.primarySkills,
    secondarySkills: secondarySkills.length > 0 ? secondarySkills : derived.secondarySkills,
    skillIds: new Set((skills.length > 0 ? skills : derived.skills).map((skill) => skill.id)),
    roles: stored.roles.length > 0 ? stored.roles : derived.roles,
    seniority: stored.seniority || derived.seniority,
    yearsOfExperience: stored.yearsOfExperience ?? derived.yearsOfExperience,
    titles: stored.titles.length > 0 ? stored.titles : derived.titles,
  };
}

export function fingerprintProfile(profile: StoredProfile) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        skills: profile.skills,
        seniority: profile.seniority,
        years: profile.yearsOfExperience,
        roles: profile.roles,
        location: profile.location,
      }),
    )
    .digest("hex")
    .slice(0, 16);
}
