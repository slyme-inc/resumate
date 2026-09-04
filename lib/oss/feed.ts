import { generateOssContributeGuide, type OssContributeGuide } from "@/lib/ai/oss";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { getOssRepo, listOssRepoPool, OSS_REPO_PAGE_SIZE, type OssRepoItem } from "@/lib/db/oss";
import { getUserResumeAndProfile } from "@/lib/db/profile";
import { fingerprintCandidate, loadCandidateProfile } from "@/lib/matching/feed";
import {
  heuristicContributeGuide,
  rankOssRepos,
  scoreOssRepo,
  type RankedOssRepo,
} from "@/lib/oss/match";
import { getGithubReadme, readmeExcerpt } from "@/lib/oss/readme";
import type { CandidateProfile } from "@/lib/profile/types";
import { cacheLife } from "next/cache";
import { createHash } from "node:crypto";

export type OssFeedFilters = {
  query?: string | null;
  language?: string | null;
};

export type OssListItem = RankedOssRepo;

export type OssRepoDetail = RankedOssRepo & {
  readme: Awaited<ReturnType<typeof getGithubReadme>>;
  guide: OssContributeGuide;
};

export async function loadOssFeed(
  profile: CandidateProfile,
  filters: OssFeedFilters,
  requestedPage: number,
): Promise<{
  items: OssListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  strong: number;
  languages: { language: string; repos: number }[];
}> {
  const pool = await listOssRepoPool({ query: filters.query });
  const ranked = rankOssRepos(profile, pool, Boolean(filters.query));
  const languages = languageCounts(ranked.map((item) => item.repo));
  const language = languages.some((item) => item.language === filters.language)
    ? filters.language
    : null;
  const visible = language
    ? ranked.filter((item) => item.repo.language === language)
    : ranked;
  const pageSize = OSS_REPO_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const start = (page - 1) * pageSize;
  const pageItems = visible.slice(start, start + pageSize);

  return {
    items: pageItems,
    total: visible.length,
    page,
    pageSize,
    pageCount,
    strong: visible.filter((item) => item.match.score >= 80).length,
    languages,
  };
}

export async function loadOssRepoDetail(
  userId: string,
  profile: CandidateProfile,
  id: string,
): Promise<OssRepoDetail | null> {
  const repo = await getOssRepo(id);
  if (!repo) {
    return null;
  }

  const match = scoreOssRepo(profile, repo);
  const readme = await getGithubReadme(repo.fullName);
  const fallback = heuristicContributeGuide(profile, repo, match, readme?.markdown ?? null);
  const excerpt = readme ? readmeExcerpt(readme.markdown) : "";
  const readmeFp = createHash("sha256")
    .update(excerpt || repo.fullName)
    .digest("hex")
    .slice(0, 16);

  let guide = fallback;
  if (isGeminiConfigured()) {
    const generated = await guideForRepo(
      userId,
      fingerprintCandidate(profile),
      repo.id,
      readmeFp,
      {
        fullName: repo.fullName,
        company: repo.company,
        language: repo.language,
        industry: repo.industry,
        description: repo.description,
      },
      match.matchedSkills,
      excerpt,
    );
    if (generated) {
      guide = generated;
    }
  }

  return { repo, match, readme, guide };
}

async function guideForRepo(
  userId: string,
  profileFp: string,
  repoId: string,
  readmeFp: string,
  repo: Pick<OssRepoItem, "fullName" | "company" | "language" | "industry" | "description">,
  matchedSkills: string[],
  excerpt: string,
) {
  "use cache";

  const profile = await loadCandidateProfile(userId);
  if (!profile || fingerprintCandidate(profile) !== profileFp) {
    cacheLife("hours");
    return null;
  }

  const { resume, profile: stored } = await getUserResumeAndProfile(userId);
  try {
    const guide = await generateOssContributeGuide({
      profile,
      stored,
      resume,
      repo,
      matchedSkills,
      readmeExcerpt: excerpt,
    });
    if (guide) {
      cacheLife("days");
    } else {
      cacheLife("hours");
    }
    return guide;
  } catch (error) {
    console.error("Gemini OSS contribute guide failed; using heuristic copy.", error);
    cacheLife("hours");
    return null;
  }
}

function languageCounts(repos: OssRepoItem[]) {
  const counts = new Map<string, number>();
  for (const repo of repos) {
    const language = repo.language?.trim();
    if (!language) continue;
    counts.set(language, (counts.get(language) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([language, repos]) => ({ language, repos }))
    .sort((a, b) => b.repos - a.repos || a.language.localeCompare(b.language));
}
