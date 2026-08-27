import { ScoreBadge } from "@/components/match-score";
import { SaveButton } from "@/components/save-button";
import { formatSalary, freshness, shortLocation } from "@/lib/format";
import type { ScoredJob } from "@/lib/matching/feed";
import { skillLabel, SENIORITY_LABELS } from "@/lib/matching/taxonomy";
import Link from "next/link";

const WORK_MODE_LABELS = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
} as const;

export function JobCard({ item }: { item: ScoredJob }) {
  const { job, match } = item;
  const posted = freshness(job.date);
  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const location = shortLocation(job.location);
  const href = `/jobs/${encodeURIComponent(job.source)}/${encodeURIComponent(job.id)}`;

  const facts = [
    WORK_MODE_LABELS[job.workMode],
    location,
    SENIORITY_LABELS[job.seniority],
    salary,
  ].filter((value): value is string => Boolean(value));

  return (
    <article className="rounded-[14px] border border-line bg-card p-5 transition-colors duration-150 hover:border-line-strong">
      <div className="flex items-start gap-4">
        <ScoreBadge score={match.score} />
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-xl font-medium leading-snug tracking-tight text-ink">
            <Link href={href} className="hover:underline decoration-line-strong underline-offset-4">
              {job.position}
            </Link>
          </h3>
          <p className="mt-1 text-sm font-semibold tracking-tight text-forest">{job.company}</p>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-faint">
            {facts.map((fact, index) => (
              <span key={`${fact}-${index}`} className="flex items-center gap-2">
                {index > 0 ? <span aria-hidden="true">·</span> : null}
                {fact}
              </span>
            ))}
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-text">{match.summary}</p>

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

          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="font-mono text-[11px] text-faint">
              {posted ? posted.label : "Date not listed"}
              {posted?.stale ? " · may be closed" : ""}
            </span>
            <div className="flex items-center gap-2">
              <SaveButton
                source={job.source}
                id={job.id}
                matchScore={match.score}
                saved={item.saved}
              />
              <Link
                href={href}
                className="rounded-full border border-line-strong px-3 py-1 text-xs font-semibold tracking-tight text-ink transition-colors duration-150 hover:bg-paper"
              >
                Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
