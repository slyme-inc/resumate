import type { RoleFamily, SeniorityLevel, SkillCategory } from "@/lib/matching/taxonomy";

export type StoredSkill = {
  label: string;
  category: SkillCategory | "other";
  prominence: "primary" | "secondary";
};

export type StoredProfile = {
  version: 1;
  source: "heuristic" | "gemini" | "user";
  name: string | null;
  headline: string | null;
  location: string | null;
  seniority: SeniorityLevel;
  yearsOfExperience: number | null;
  roles: RoleFamily[];
  titles: string[];
  skills: StoredSkill[];
  strengths: string[];
  facts: string[];
  inferences: string[];
  industryInterests: string[];
  startupSuitability: string | null;
  updatedAt: string;
};

export function isStoredProfile(value: unknown): value is StoredProfile {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Partial<StoredProfile>;
  return record.version === 1 && Array.isArray(record.skills) && Array.isArray(record.roles);
}
