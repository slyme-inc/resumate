import type { GapSeverity } from "@/lib/matching/score";

export type GeminiProfileDraft = {
  name: string | null;
  headline: string | null;
  location: string | null;
  seniority: string | null;
  yearsOfExperience: number | null;
  roles: string[];
  titles: string[];
  primarySkills: string[];
  secondarySkills: string[];
  strengths: string[];
  facts: string[];
  inferences: string[];
  industryInterests: string[];
  startupSuitability: string | null;
};

export type ResumeRewrite = {
  current: string;
  suggested: string;
  reason: string;
};

export type OpportunityInsight = {
  version: 1;
  whyFit: string;
  strengths: string[];
  gaps: Array<{
    label: string;
    severity: GapSeverity;
    note: string;
  }>;
  resumeFit: {
    keep: string[];
    emphasize: string[];
    improve: ResumeRewrite[];
    deEmphasize: string[];
    missing: string[];
  };
  approach: {
    steps: string[];
    note: string;
  };
  companyFromPosting: string | null;
};

export function isOpportunityInsight(value: unknown): value is OpportunityInsight {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Partial<OpportunityInsight>;
  return record.version === 1 && typeof record.whyFit === "string" && Boolean(record.resumeFit);
}
