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
import { flattenResume } from "@/lib/resume/lines";
import type { ParsedResume } from "@/lib/resume/types";

const ROLE_IDS = Object.keys(ROLE_LABELS) as RoleFamily[];
const SENIORITY_IDS = Object.keys(SENIORITY_LABELS) as SeniorityLevel[];

function clip(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}\n…[truncated]` : text;
}

function resumeDigest(resume: ParsedResume) {
  const header = [
    resume.name ? `Name: ${resume.name}` : null,
    resume.headline ? `Headline: ${resume.headline}` : null,
    resume.location ? `Location: ${resume.location}` : null,
    resume.email ? `Email: ${resume.email}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const structured = flattenResume(resume)
    .map((line) => {
      if (line.display === "heading") return `\n## ${line.text}`;
      if (line.display === "bullet") return `- ${line.text}`;
      if (line.display === "tags") return line.text;
      return line.text;
    })
    .join("\n");

  return clip(`${header}\n${structured}`, 6_000);
}

export async function extractProfileWithGemini(resume: ParsedResume): Promise<StoredProfile> {
  const draft = await generateJson<GeminiProfileDraft>(
    `You extract a candidate profile from a résumé. Return JSON only.

Rules:
- Use only information present in the résumé. Never invent jobs, skills, employers, or years.
- facts[]: statements directly supported by the résumé.
- inferences[]: cautious interpretations, written as inferences, not facts.
- primarySkills: 4–8 individual technologies the candidate clearly owns. One skill per array item. Use the name as written (Vite stays Vite, BigQuery stays BigQuery). Never group unrelated tools.
- secondarySkills: other technologies mentioned, not guessed. One skill per array item.
- roles: EXACT ids from this list only: ${ROLE_IDS.join(", ")}.
  Map "software engineer" / "SWE" without a front/back/mobile signal to fullstack.
- seniority: EXACT ids from this list only: ${SENIORITY_IDS.join(", ")}.
  Infer from job titles first (Intern/Junior/Senior/Staff/Principal). Do not promote someone to staff/principal just because calendar years are high.
- yearsOfExperience: integer years of professional work only.
  Count employment date ranges, merging overlaps. Exclude education, graduation years, and certifications.
  A 2024–present role in ${new Date().getFullYear()} is about ${new Date().getFullYear() - 2024} years, not the span back to a 2018 degree.
  Null if dates are too unclear to estimate.
- titles: job titles from work experience only, not project names.
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

Résumé:
${resumeDigest(resume)}
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
