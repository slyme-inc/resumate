import type { OssContributeGuide } from "@/lib/ai/oss";
import type { OssRepoItem } from "@/lib/db/oss";
import { extractSkills } from "@/lib/matching/extract";
import { skillLabel } from "@/lib/matching/taxonomy";
import { normalizeForMatch } from "@/lib/matching/text";
import { sectionByHeading, setupCommands } from "@/lib/oss/readme";
import type { CandidateProfile } from "@/lib/profile/types";

export type OssMatch = {
  score: number;
  summary: string;
  contribute: string[];
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

function repoShortName(repo: OssRepoItem) {
  const slash = repo.fullName.lastIndexOf("/");
  return slash >= 0 ? repo.fullName.slice(slash + 1) : repo.fullName;
}

function heuristicContribute(repo: OssRepoItem) {
  const desc = `${repo.description ?? ""} ${repo.fullName}`.toLowerCase();
  const items: string[] = [];
  if (/\b(sdk|api|client|library)\b/.test(desc)) {
    items.push(`Add a failing example or type-safe wrapper around the public ${repo.language ?? "API"}.`);
  }
  if (/\b(cli|tool|agent)\b/.test(desc)) {
    items.push("Cover an untested flag path and tighten the help text to match actual behavior.");
  }
  if (/\b(infra|deploy|kubernetes|terraform|ci)\b/.test(desc)) {
    items.push("Harden CI or deploy docs so a new contributor can run the stack locally.");
  }
  if (items.length === 0 && repo.description) {
    items.push(`Start with tests or docs around: ${repo.description.replace(/\s+/g, " ").trim().slice(0, 90)}.`);
  }
  if (items.length < 2) {
    items.push(
      repo.language
        ? `Scan open issues labelled ${repo.language} or good-first-issue and match existing code style.`
        : "Read CONTRIBUTING and land a small docs or test PR before touching core paths.",
    );
  }
  return items.slice(0, 2);
}

export function heuristicContributeGuide(
  profile: CandidateProfile,
  repo: OssRepoItem,
  match: OssMatch,
  readme: string | null,
): OssContributeGuide {
  const name = repoShortName(repo);
  const skills = match.matchedSkills.map(skillLabel);
  const skillText = skillList(match.matchedSkills);
  const title = profile.titles[0] ?? profile.headline ?? "your current work";
  const desc = repo.description?.replace(/\s+/g, " ").trim() ?? "";
  const contributing = readme
    ? sectionByHeading(readme, /contribut|getting started|development|setup|local/i)
    : "";
  const commands = readme ? setupCommands(readme) : [];

  const overview = desc
    ? `${name} is a public ${repo.language ? `${repo.language} ` : ""}project at ${repo.company}. ${desc} First contributions should stay at the edges — tests, docs, examples, and typed wrappers — until you know the module boundaries.`
    : `${name} is maintained by ${repo.company}.${repo.language ? ` It is primarily ${repo.language}.` : ""} Read the README on the right, then look for issues labelled good-first-issue or documentation before touching core paths.`;

  const resumeFit =
    skillText.length > 0
      ? `Your résumé shows ${skillText}${title ? `, including work as ${title}` : ""}. Those skills are the ones this repo can actually use. Stay inside them: propose a change that resembles something you have already shipped, then match the repo's existing tests and code style. Do not volunteer a stack that is not on the résumé.`
      : `Overlap with ${name} is thin on the résumé. Treat this as a reading repo unless you want a docs, examples, or test on-ramp that does not require claiming a skill you have not demonstrated.`;

  const contributions = heuristicContribute(repo).map((how, index) => {
    const skill = skills[index] ?? skills[0];
    return {
      title: skill ? `Use ${skill} on a small ${name} change` : `A conservative first PR on ${name}`,
      whyYou: skill
        ? `${skill} appears on your résumé${title ? ` (${title})` : ""}. A small, reviewable change in that area is easier to defend than a core refactor.`
        : "Without a strong skill overlap, docs and tests are the honest first contribution.",
      how,
    };
  });

  if (contributions.length < 3) {
    contributions.push({
      title: "Fix a docs gap you hit while setting up",
      whyYou:
        "Setup friction is public evidence. Writing the missing step is a valid contribution even when you are new to the codebase.",
      how: "Clone the repo, follow the README until something fails or is unclear, and open a PR that adds the missing command, flag, or example.",
    });
  }

  const gettingStarted = [
    `Open ${repo.fullName} and read README plus CONTRIBUTING (if present) before writing code.`,
    ...(commands.length > 0
      ? commands.map((command) => `From the README: \`${command}\`.`)
      : [
          `Clone the repository and install the ${repo.language ?? "project"} toolchain the README names.`,
          "Run the test suite or example app once so you know the green baseline.",
        ]),
    "Filter issues by good-first-issue, documentation, or the language you already use.",
    "Keep the first PR small enough that a maintainer can review it in one sitting.",
  ].slice(0, 8);

  const watchouts = [
    contributing
      ? "Follow the contributing section in the README rather than inventing a process."
      : "This README does not spell out a contributing process — keep the first change small and ask in the issue thread before a large rewrite.",
    "Do not add a skill, employer, or library on a PR description that is not already on your résumé.",
  ];

  return {
    overview,
    resumeFit,
    contributions: contributions.slice(0, 5),
    gettingStarted,
    watchouts,
  };
}

function buildSummary(repo: OssRepoItem, matched: string[], languageHit: boolean) {
  const name = repoShortName(repo);
  const list = skillList(matched);
  const desc = repo.description?.replace(/\s+/g, " ").trim() ?? "";

  if (list && desc) {
    return `${list} from your résumé applies to ${name} at ${repo.company}: ${desc.length > 140 ? `${desc.slice(0, 139).trim()}…` : desc}`;
  }
  if (desc) {
    return `${repo.company} maintains ${name} — ${desc.length > 160 ? `${desc.slice(0, 159).trim()}…` : desc}`;
  }
  if (list && languageHit) {
    return `${name} is a ${repo.language} project at ${repo.company}. Use ${list} on a small issue before changing core modules.`;
  }
  if (list) {
    return `${name} at ${repo.company} overlaps ${list}. Docs and tests are the safest first contribution.`;
  }
  return `Thin overlap with ${name} at ${repo.company}. Treat this as a reading repo unless you want a docs or test on-ramp.`;
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
      contribute: heuristicContribute(repo),
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
    contribute: heuristicContribute(repo),
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
