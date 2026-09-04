import { LinkPreviewSkeleton, PreviewFrame } from "@/components/link-preview-card";
import { getLinkPreview } from "@/lib/link-preview";
import type { OssListItem } from "@/lib/oss/feed";
import { githubOgImage } from "@/lib/oss/readme";
import { isRecentPush, ossRepoPath, repoTitle, ycCompanyUrl } from "@/lib/oss/display";
import { Suspense } from "react";

export const OSS_REPO_GRID = "mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

export function OssRepoCard({ item }: { item: OssListItem }) {
  return (
    <Suspense fallback={<LinkPreviewSkeleton />}>
      <OssRepoPreview item={item} />
    </Suspense>
  );
}

async function OssRepoPreview({ item }: { item: OssListItem }) {
  const { repo, match } = item;
  const websitePreview = repo.website ? await getLinkPreview(repo.website) : null;
  const repoPreview = repo.repoUrl ? await getLinkPreview(repo.repoUrl) : null;
  const ycPreview = repo.ycSlug ? await getLinkPreview(ycCompanyUrl(repo.ycSlug)) : null;
  const image =
    websitePreview?.image ??
    repoPreview?.image ??
    ycPreview?.image ??
    githubOgImage(repo.fullName);
  const logo = websitePreview?.logo ?? repoPreview?.logo ?? ycPreview?.logo ?? null;

  return (
    <PreviewFrame
      href={ossRepoPath(repo.id)}
      title={repoTitle(repo.fullName)}
      tag={repo.language ?? repo.company}
      fresh={isRecentPush(repo.pushedAt)}
      badge={`${match.score} match`}
      image={image}
      logo={logo}
      external={false}
    />
  );
}
