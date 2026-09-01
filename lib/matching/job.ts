import type { job } from "@/lib/db/schema";
import {
  detectRequiredYears,
  detectRole,
  detectSeniority,
  detectWorkMode,
  extractSkills,
  mergeCounts,
  type WorkMode,
} from "./extract";
import { extractRoleCard, isRoleCard, type RoleCard } from "./role-card";
import { SKILL_BY_ID, type RoleFamily, type SeniorityLevel } from "./taxonomy";
import { htmlToText } from "./text";

export type JobRow = typeof job.$inferSelect;

/** Columns the matcher actually reads. Feed queries skip the rest. */
export type JobScoreRow = Pick<
  JobRow,
  | "source"
  | "id"
  | "slug"
  | "company"
  | "companyLogo"
  | "logo"
  | "position"
  | "tags"
  | "description"
  | "location"
  | "applyUrl"
  | "url"
  | "date"
  | "salaryMin"
  | "salaryMax"
> & {
  roleCard?: RoleCard | null;
};

export type NormalizedJob = {
  source: string;
  id: string;
  slug: string | null;
  company: string;
  position: string;
  location: string | null;
  applyUrl: string | null;
  url: string | null;
  companyLogo: string | null;
  date: Date | null;
  salaryMin: number | null;
  salaryMax: number | null;
  tags: string[];
  description: string;
  /** Skill id -> mention count, used as a proxy for importance. */
  skillCounts: Map<string, number>;
  skills: string[];
  role: RoleFamily;
  seniority: SeniorityLevel;
  workMode: WorkMode;
  requiredYears: number | null;
  roleCard: RoleCard;
};

export function jobKey(source: string, id: string) {
  return `${source}:${id}`;
}

export function normalizeJob(row: JobScoreRow): NormalizedJob {
  const description = row.description ? htmlToText(row.description) : "";
  const position = row.position ?? "Untitled role";
  const tags = row.tags ?? [];

  // Tags and the title are curated, so they unlock ambiguous skills and are
  // weighted above incidental mentions in the description body.
  const fromTags = extractSkills(tags.join(" \n "), true);
  const fromTitle = extractSkills(position, true);
  const fromDescription = extractSkills(description, false);

  const boosted = new Map<string, number>();
  for (const [id, count] of mergeCounts(fromTags, fromTitle)) {
    boosted.set(id, count * 3);
  }
  const skillCounts = mergeCounts(boosted, fromDescription);

  const skills = [...skillCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
    .filter((id) => SKILL_BY_ID.has(id));

  const roleCard = isRoleCard(row.roleCard)
    ? row.roleCard
    : extractRoleCard({ title: position, tags, description });

  return {
    source: row.source,
    id: row.id,
    slug: row.slug,
    company: row.company ?? "Unknown company",
    position,
    location: row.location,
    applyUrl: row.applyUrl,
    url: row.url,
    companyLogo: row.companyLogo ?? row.logo,
    date: row.date ? new Date(row.date) : null,
    salaryMin: row.salaryMin,
    salaryMax: row.salaryMax,
    tags,
    description,
    skillCounts,
    skills,
    role: detectRole(position, tags.join(" ")),
    seniority: detectSeniority(position, description),
    workMode: detectWorkMode(row.location, description, position),
    requiredYears: detectRequiredYears(description),
    roleCard,
  };
}
