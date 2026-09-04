import { generateJson } from "@/lib/ai/gemini";
import type { OssRepoItem } from "@/lib/db/oss";
import { skillLabel } from "@/lib/matching/taxonomy";
import type { CandidateProfile } from "@/lib/profile/types";
import type { StoredProfile } from "@/lib/profile/stored";
import { flattenResume } from "@/lib/resume/lines";
import type { ParsedResume } from "@/lib/resume/types";

export type OssContributionInsight = {
  summary: string;
  contribute: string[];
};

export type OssContribution = {
  title: string;
  whyYou: string;
  how: string;
};

export type OssContributeGuide = {
  overview: string;
  resumeFit: string;
  contributions: OssContribution[];
  gettingStarted: string[];
  watchouts: string[];
};

function clip(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

function cleanSummary(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length < 24) {
    return null;
  }
  if (/experience lines up with this\b/i.test(text)) {
    return null;
  }
  return clip(text, 320);
}

function cleanContribute(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  const items: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string") {
      continue;
    }
    const text = entry.replace(/\s+/g, " ").trim();
    const key = text.toLowerCase();
    if (text.length < 16 || seen.has(key)) {
      continue;
    }
    seen.add(key);
    items.push(clip(text, 160));
    if (items.length === 2) {
      break;
    }
  }
  return items;
}

export async function generateOssContributionInsights(input: {
  profile: CandidateProfile;
  stored: StoredProfile | null;
  resume: ParsedResume | null;
  repos: Array<{
    id: string;
    repo: Pick<OssRepoItem, "fullName" | "company" | "language" | "industry" | "description">;
    matchedSkills: string[];
  }>;
}): Promise<Record<string, OssContributionInsight>> {
  const { profile, stored, resume, repos } = input;
  if (repos.length === 0) {
    return {};
  }

  const bullets =
    resume
      ? flattenResume(resume)
          .filter((line) => line.display === "bullet" || line.display === "body")
          .map((line) => line.text)
          .filter((text) => text.length > 24)
          .slice(0, 10)
      : [];

  const payload = await generateJson<{
    insights?: Array<{ id?: unknown; summary?: unknown; contribute?: unknown }>;
  }>(
    `You advise one software candidate on open-source repos they could contribute to.
Return JSON only.

Hard rules:
- Use only facts on the candidate card and résumé bullets. Never invent jobs, skills, or projects.
- Each insight MUST name a specific résumé fact (employer, project, domain, or library) and how it maps to THAT repo. Do not write a generic language match.
- Forbidden phrasing: "lines up with", "your TypeScript experience", "your X experience lines up with this X repository".
- contribute: 1–2 concrete first contributions grounded in the repo description (tests, docs, API examples, CI, a module). Not "open a PR" or "read the code".
- If overlap is thin, say so and suggest a realistic on-ramp. Do not oversell.
- Copy each repo id verbatim.

JSON shape:
{ "insights": [{ "id": string, "summary": string, "contribute": string[] }] }

Candidate:
${JSON.stringify({
  name: stored?.name ?? profile.name,
  headline: stored?.headline ?? profile.headline,
  seniority: stored?.seniority ?? profile.seniority,
  years: stored?.yearsOfExperience ?? profile.yearsOfExperience,
  roles: stored?.roles ?? profile.roles,
  titles: (stored?.titles ?? profile.titles).slice(0, 6),
  primarySkills: stored
    ? stored.skills.filter((skill) => skill.prominence === "primary").map((skill) => skill.label)
    : profile.primarySkills.map((skill) => skill.label),
  secondarySkills: stored
    ? stored.skills.filter((skill) => skill.prominence === "secondary").slice(0, 8).map((skill) => skill.label)
    : profile.secondarySkills.slice(0, 8).map((skill) => skill.label),
  facts: (stored?.facts ?? []).slice(0, 8),
  strengths: (stored?.strengths ?? []).slice(0, 5),
  bullets,
})}

Repos:
${JSON.stringify(
  repos.map(({ id, repo, matchedSkills }) => ({
    id,
    fullName: repo.fullName,
    company: repo.company,
    language: repo.language,
    industry: repo.industry,
    description: clip(repo.description ?? "", 180),
    overlap: matchedSkills.slice(0, 6).map(skillLabel),
  })),
)}
`,
    { deadlineMs: 22_000, temperature: 0.35, maxOutputTokens: 4096 },
  );

  const allowed = new Set(repos.map((item) => item.id));
  const insights: Record<string, OssContributionInsight> = {};
  for (const row of payload.insights ?? []) {
    if (typeof row.id !== "string" || !allowed.has(row.id)) {
      continue;
    }
    const summary = cleanSummary(row.summary);
    if (!summary) {
      continue;
    }
    insights[row.id] = {
      summary,
      contribute: cleanContribute(row.contribute),
    };
  }
  return insights;
}

function cleanParagraph(value: unknown, min: number, max: number) {
  if (typeof value !== "string") {
    return null;
  }
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length < min) {
    return null;
  }
  return clip(text, max);
}

function cleanStrings(value: unknown, min: number, max: number, limit: number) {
  if (!Array.isArray(value)) {
    return [];
  }
  const items: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    const text = cleanParagraph(entry, min, max);
    if (!text) {
      continue;
    }
    const key = text.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    items.push(text);
    if (items.length === limit) {
      break;
    }
  }
  return items;
}

function cleanContributions(value: unknown): OssContribution[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const items: OssContribution[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const row = entry as { title?: unknown; whyYou?: unknown; how?: unknown };
    const title = cleanParagraph(row.title, 8, 80);
    const whyYou = cleanParagraph(row.whyYou, 24, 420);
    const how = cleanParagraph(row.how, 24, 520);
    if (!title || !whyYou || !how) {
      continue;
    }
    items.push({ title, whyYou, how });
    if (items.length === 5) {
      break;
    }
  }
  return items;
}

export async function generateOssContributeGuide(input: {
  profile: CandidateProfile;
  stored: StoredProfile | null;
  resume: ParsedResume | null;
  repo: Pick<OssRepoItem, "fullName" | "company" | "language" | "industry" | "description">;
  matchedSkills: string[];
  readmeExcerpt: string;
}): Promise<OssContributeGuide | null> {
  const { profile, stored, resume, repo, matchedSkills, readmeExcerpt } = input;

  const bullets =
    resume
      ? flattenResume(resume)
          .filter((line) => line.display === "bullet" || line.display === "body")
          .map((line) => line.text)
          .filter((text) => text.length > 24)
          .slice(0, 14)
      : [];

  const payload = await generateJson<Partial<OssContributeGuide>>(
    `You advise one software candidate on how to contribute to ONE open-source repository.
Return JSON only.

Hard rules:
- Use only facts on the candidate card, résumé bullets, repo metadata, and README excerpt. Never invent jobs, skills, employers, or files.
- Name specific résumé facts (employer, project, domain, or library) when explaining what they can contribute. Do not write a generic language match.
- Forbidden phrasing: "lines up with", "your X experience lines up with this X repository".
- Ground gettingStarted in the README when it describes setup, contributing, or local development. If the README is thin, say so and give a conservative on-ramp (clone, run tests, docs/tests first).
- contributions: 3–5 concrete first PRs this person could actually land, each tied to a résumé fact. Not "open a PR" or "read the code".
- If overlap is thin, say so. Do not oversell.

JSON shape:
{
  "overview": string,
  "resumeFit": string,
  "contributions": [{ "title": string, "whyYou": string, "how": string }],
  "gettingStarted": string[],
  "watchouts": string[]
}

Candidate:
${JSON.stringify({
  name: stored?.name ?? profile.name,
  headline: stored?.headline ?? profile.headline,
  seniority: stored?.seniority ?? profile.seniority,
  years: stored?.yearsOfExperience ?? profile.yearsOfExperience,
  roles: stored?.roles ?? profile.roles,
  titles: (stored?.titles ?? profile.titles).slice(0, 6),
  primarySkills: stored
    ? stored.skills.filter((skill) => skill.prominence === "primary").map((skill) => skill.label)
    : profile.primarySkills.map((skill) => skill.label),
  secondarySkills: stored
    ? stored.skills
        .filter((skill) => skill.prominence === "secondary")
        .slice(0, 8)
        .map((skill) => skill.label)
    : profile.secondarySkills.slice(0, 8).map((skill) => skill.label),
  facts: (stored?.facts ?? []).slice(0, 8),
  strengths: (stored?.strengths ?? []).slice(0, 5),
  bullets,
})}

Repo:
${JSON.stringify({
  fullName: repo.fullName,
  company: repo.company,
  language: repo.language,
  industry: repo.industry,
  description: clip(repo.description ?? "", 280),
  overlap: matchedSkills.slice(0, 8).map(skillLabel),
})}

README excerpt:
${clip(readmeExcerpt || "(no README fetched)", 8_000)}
`,
    { deadlineMs: 25_000, temperature: 0.3, maxOutputTokens: 4096 },
  );

  const overview = cleanParagraph(payload.overview, 40, 900);
  const resumeFit = cleanParagraph(payload.resumeFit, 40, 900);
  const contributions = cleanContributions(payload.contributions);
  const gettingStarted = cleanStrings(payload.gettingStarted, 16, 280, 8);
  const watchouts = cleanStrings(payload.watchouts, 16, 280, 4);
  if (!overview || !resumeFit || contributions.length === 0 || gettingStarted.length === 0) {
    return null;
  }

  return {
    overview,
    resumeFit,
    contributions,
    gettingStarted,
    watchouts,
  };
}
