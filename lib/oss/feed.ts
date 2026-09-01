import { listOssRepoPool, OSS_REPO_PAGE_SIZE, type OssRepoItem } from "@/lib/db/oss";
import { rankOssRepos, type RankedOssRepo } from "@/lib/oss/match";
import type { CandidateProfile } from "@/lib/profile/types";

export type OssFeedFilters = {
  query?: string | null;
  language?: string | null;
};

export type OssListItem = RankedOssRepo;

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

  return {
    items: visible.slice(start, start + pageSize),
    total: visible.length,
    page,
    pageSize,
    pageCount,
    strong: visible.filter((item) => item.match.score >= 80).length,
    languages,
  };
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
