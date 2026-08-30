import { generateJson } from "@/lib/ai/gemini";
import type { GeminiProfileDraft } from "@/lib/ai/types";
import {
  ROLE_LABELS,
  SENIORITY_LABELS,
  type RoleFamily,
  type SeniorityLevel,
} from "@/lib/matching/taxonomy";
import { toStoredProfile } from "@/lib/profile/hydrate";
import type { StoredProfile } from "@/lib/profile/stored";
import type { ParsedResume } from "@/lib/resume/types";

const ROLE_IDS = Object.keys(ROLE_LABELS) as RoleFamily[];
const SENIORITY_IDS = Object.keys(SENIORITY_LABELS) as SeniorityLevel[];

function clip(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}\n…[truncated]` : text;
}

export async function extractProfileWithGemini(resume: ParsedResume): Promise<StoredProfile> {
  const draft = await generateJson<GeminiProfileDraft>(
    `You extract a candidate profile from a résumé. Return JSON only.

Rules:
- Use only information present in the résumé. Never invent jobs, skills, employers, or years.
- facts[]: statements directly supported by the résumé.
- inferences[]: cautious interpretations, written as inferences, not facts.
- primarySkills: the 4–8 technologies the candidate clearly owns.
- secondarySkills: other technologies mentioned, not guessed.
- roles: choose from ${ROLE_IDS.join(", ")}.
- seniority: choose from ${SENIORITY_IDS.join(", ")}.
- yearsOfExperience: integer years spanned by employment dates, or null if unclear.
- startupSuitability: one short inference or null.
- industryInterests: only if the résumé supports them.

JSON shape:
{
  "name": string | null,
  "headline": string | null,
  "location": string | null,
  "seniority": string | null,
  "yearsOfExperience": number | null,
  "roles": string[],
  "titles": string[],
  "primarySkills": string[],
  "secondarySkills": string[],
  "strengths": string[],
  "facts": string[],
  "inferences": string[],
  "industryInterests": string[],
  "startupSuitability": string | null
}

Résumé text:
${clip(resume.rawText || JSON.stringify(resume.sections), 8000)}
`,
  );

  return toStoredProfile(resume, {
    source: "gemini",
    name: draft.name,
    headline: draft.headline,
    location: draft.location,
    seniority: draft.seniority,
    yearsOfExperience: draft.yearsOfExperience,
    roles: draft.roles,
    titles: draft.titles,
    primarySkills: draft.primarySkills,
    secondarySkills: draft.secondarySkills,
    strengths: draft.strengths,
    facts: draft.facts,
    inferences: draft.inferences,
    industryInterests: draft.industryInterests,
    startupSuitability: draft.startupSuitability,
  });
}
