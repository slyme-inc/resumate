import { extractSkills } from "@/lib/matching/extract";
import { skillLabel } from "@/lib/matching/taxonomy";
import { normalizeForMatch } from "@/lib/matching/text";
import type { CandidateProfile } from "@/lib/profile/types";
import type { OssRepoItem } from "@/lib/db/oss";

export type OssMatch = {
  score: number;
  summary: string;
  matchedSkills: string[];
};

export type RankedOssRepo = {
  repo: OssRepoItem;
  match: OssMatch;
};

const NOISE_SKILLS = new Set(["git", "agile", "jira"]);

const GITHUB_LANGUAGE_SKILL: Record<string, string> = {
  TypeScript: "typescript",
  JavaScript: "javascript",
  Python: "python",
  Go: "go",
  Rust: "rust",
  Java: "java",
  "C#": "csharp",
  "C++": "cpp",
  C: "c",
  Ruby: "ruby",
  PHP: "php",
  Scala: "scala",
  Kotlin: "kotlin",
  Swift: "swift",
  Elixir: "elixir",
  Shell: "bash",
  HTML: "html",
  CSS: "css",
  "Jupyter Notebook": "python",
  Cuda: "cpp",
  MDX: "javascript",
  HCL: "terraform",
};

function unique(ids: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (seen.has(id) || NOISE_SKILLS.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function languageSkillId(language: string | null) {
  if (!language?.trim()) {
    return null;
  }
  return GITHUB_LANGUAGE_SKILL[language] ?? null;
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

function skillList(ids: string[]) {
  const labels = ids.slice(0, 3).map(skillLabel);
  if (labels.length === 0) {
    return "";
  }
  if (labels.length === 1) {
    return labels[0];
  }
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

function buildSummary(repo: OssRepoItem, matched: string[], languageHit: boolean) {
  const list = skillList(matched);
  const language = repo.language;
  const where = language ? `this ${language} repository` : "this repository";

  if (list && languageHit) {
    return `Your ${list} experience lines up with ${where} at ${repo.company}.`;
  }
  if (list) {
    return `${repo.company}'s ${where} overlaps ${list} on your profile.`;
  }
  return `Little overlap with your stack in ${where} at ${repo.company}.`;
}

export function scoreOssRepo(profile: CandidateProfile, repo: OssRepoItem): OssMatch {
  const langId = languageSkillId(repo.language);
  const haystack = normalizeForMatch(
    [repo.fullName, repo.description, repo.industry, repo.language].filter(Boolean).join(" "),
  );
  const extracted = extractSkills(
    [repo.fullName, repo.description, repo.industry].filter(Boolean).join(" "),
    false,
  );
  if (langId) {
    extracted.set(langId, (extracted.get(langId) ?? 0) + 2);
  }

  const repoSkills = unique([...extracted.keys()]);
  const matched = unique([
    ...repoSkills.filter((id) => candidateHas(profile, id)),
    ...openVocabHits(profile, haystack),
  ]);
  const languageHit = Boolean(langId && candidateHas(profile, langId));
  const primaryHits = profile.primarySkills.filter((skill) => matched.includes(skill.id));

  if (matched.length === 0) {
    return {
      score: 0,
      summary: buildSummary(repo, matched, languageHit),
      matchedSkills: [],
    };
  }

  const languageScore = languageHit ? 1 : langId ? 0.12 : 0.5;
  const stackDenom = Math.max(repoSkills.length, 1);
  const stackScore = Math.min(1, (matched.length + primaryHits.length) / (stackDenom + 1));
  let score = Math.round(100 * (0.55 * languageScore + 0.45 * stackScore));

  if (languageHit && primaryHits.some((skill) => skill.id === langId)) {
    score = Math.max(score, 78);
  }

  return {
    score: Math.min(99, Math.max(score, 1)),
    summary: buildSummary(repo, primaryHits.length > 0 ? primaryHits.map((skill) => skill.id) : matched, languageHit),
    matchedSkills: matched.slice(0, 8),
  };
}

export function rankOssRepos(
  profile: CandidateProfile,
  repos: OssRepoItem[],
  keepUnmatched: boolean,
): RankedOssRepo[] {
  return repos
    .map((repo) => ({ repo, match: scoreOssRepo(profile, repo) }))
    .filter((item) => keepUnmatched || item.match.score > 0)
    .sort(
      (a, b) =>
        b.match.score - a.match.score ||
        (b.repo.stars ?? 0) - (a.repo.stars ?? 0) ||
        (b.repo.pushedAt?.getTime() ?? 0) - (a.repo.pushedAt?.getTime() ?? 0) ||
        a.repo.fullName.localeCompare(b.repo.fullName),
    );
}
