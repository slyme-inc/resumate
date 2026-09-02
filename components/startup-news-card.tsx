import { LinkPreviewSkeleton, PreviewFrame } from "@/components/link-preview-card";
import type { StartupNewsItem } from "@/lib/db/startups";
import { getLinkPreview } from "@/lib/link-preview";
import {
  industryTags,
  isFreshNews,
  newsHeadline,
  sourceLabel,
} from "@/lib/startup/news";
import { Suspense } from "react";

export const STARTUP_NEWS_GRID =
  "mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

export function StartupNewsCard({ item }: { item: StartupNewsItem }) {
  return (
    <Suspense fallback={<LinkPreviewSkeleton />}>
      <StartupNewsPreview item={item} />
    </Suspense>
  );
}

async function StartupNewsPreview({ item }: { item: StartupNewsItem }) {
  const tags = industryTags(item.industry);
  const websitePreview = item.website ? await getLinkPreview(item.website) : null;
  const sourcePreview =
    item.sourceUrl && item.sourceUrl !== item.website ? await getLinkPreview(item.sourceUrl) : null;
  const image =
    item.kind === "yc"
      ? (websitePreview?.image ?? sourcePreview?.image ?? null)
      : (sourcePreview?.image ?? websitePreview?.image ?? null);
  const logo = websitePreview?.logo ?? sourcePreview?.logo ?? null;

  return (
    <PreviewFrame
      href={websitePreview?.url ?? sourcePreview?.url ?? item.website ?? item.sourceUrl}
      title={newsHeadline(item)}
      tag={tags[0] ?? sourceLabel(item.source)}
      fresh={isFreshNews(item.announcedAt)}
      image={image}
      logo={logo}
    />
  );
}
