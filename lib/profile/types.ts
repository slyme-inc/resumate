import type { RoleFamily, SeniorityLevel, SkillCategory } from "@/lib/matching/taxonomy";

export type ProfileSkill = {
  id: string;
  label: string;
  category: SkillCategory;
  /** How often the skill appears across the résumé; drives primary vs secondary. */
  weight: number;
};

export type CandidateProfile = {
  name: string | null;
  headline: string | null;
  location: string | null;
  skills: ProfileSkill[];
  primarySkills: ProfileSkill[];
  secondarySkills: ProfileSkill[];
  skillIds: Set<string>;
  roles: RoleFamily[];
  seniority: SeniorityLevel;
  yearsOfExperience: number | null;
  titles: string[];
};
