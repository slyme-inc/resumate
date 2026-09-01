import type { StartupNewsItem } from "@/lib/db/startups";
import {
  industryTags,
  newsDateLabel,
  newsHeadline,
  sourceLabel,
  sourceUrlLabel,
} from "@/lib/startup/news";

export function StartupNewsCard({ item }: { item: StartupNewsItem }) {
  const tags = industryTags(item.industry);
  const date = newsDateLabel(item.announcedAt);
  const source = sourceLabel(item.source);
  const kicker = [date, source, item.country].filter(Boolean).join(" · ");
  const links = [
    item.website ? ["Website", item.website] : null,
    item.sourceUrl ? [sourceUrlLabel(item.source), item.sourceUrl] : null,
  ].filter((value): value is [string, string] => value !== null);

  return (
    <article className="rounded-[14px] border border-line bg-card p-5">
      {kicker ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">{kicker}</p>
      ) : null}
      <h3 className="mt-2 font-serif text-xl font-medium leading-snug tracking-tight text-ink">
        {newsHeadline(item)}
      </h3>
      {tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-forest-soft px-2.5 py-1 text-xs font-medium tracking-tight text-forest"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      {links.length > 0 ? (
        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold tracking-tight">
          {links.map(([label, href], index) => (
            <span key={href} className="flex items-center gap-3">
              {index > 0 ? <span className="font-mono text-[11px] font-normal text-faint">·</span> : null}
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="text-forest hover:underline"
              >
                {label}
              </a>
            </span>
          ))}
        </p>
      ) : null}
    </article>
  );
}
