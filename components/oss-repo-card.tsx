import { ScoreBadge } from "@/components/match-score";
import type { OssListItem } from "@/lib/oss/feed";
import { formatStars, pushedLabel, repoTitle, ycCompanyUrl } from "@/lib/oss/display";
import { skillLabel } from "@/lib/matching/taxonomy";

export function OssRepoCard({ item }: { item: OssListItem }) {
  const { repo, match } = item;
  const stars = formatStars(repo.stars);
  const pushed = pushedLabel(repo.pushedAt);
  const facts = [repo.company, repo.ycBatch, repo.language, stars ? `${stars} stars` : null, pushed].filter(
    (value): value is string => Boolean(value),
  );
  const links = [
    repo.repoUrl ? ["GitHub", repo.repoUrl] : null,
    repo.ycSlug ? ["YC profile", ycCompanyUrl(repo.ycSlug)] : null,
  ].filter((value): value is [string, string] => value !== null);

  return (
    <article className="rounded-[14px] border border-line bg-card p-5">
      <div className="flex items-start gap-4">
        <ScoreBadge score={match.score} />
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-xl font-medium leading-snug tracking-tight text-ink">
            {repoTitle(repo.fullName)}
          </h3>
          <p className="mt-1 text-sm font-semibold tracking-tight text-forest">{repo.fullName}</p>
          {facts.length > 0 ? (
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-faint">
              {facts.map((fact, index) => (
                <span key={`${fact}-${index}`} className="flex items-center gap-2">
                  {index > 0 ? <span aria-hidden="true">·</span> : null}
                  {fact}
                </span>
              ))}
            </p>
          ) : null}
          <p className="mt-3 text-[15px] leading-relaxed text-text">{match.summary}</p>
          {repo.description ? (
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{repo.description}</p>
          ) : null}
          {match.matchedSkills.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {match.matchedSkills.slice(0, 6).map((id) => (
                <span
                  key={id}
                  className="rounded-full bg-forest-soft px-2.5 py-1 text-xs font-medium tracking-tight text-forest"
                >
                  {skillLabel(id)}
                </span>
              ))}
            </div>
          ) : null}
          {links.length > 0 ? (
            <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold tracking-tight">
              {links.map(([label, href], index) => (
                <span key={href} className="flex items-center gap-3">
                  {index > 0 ? <span className="font-mono text-[11px] font-normal text-faint">·</span> : null}
                  <a href={href} target="_blank" rel="noreferrer" className="text-forest hover:underline">
                    {label}
                  </a>
                </span>
              ))}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
