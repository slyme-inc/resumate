import { AppHeader } from "@/components/app-header";
import { GapList, ScoreBadge, ScoreBreakdown } from "@/components/match-score";
import { SaveButton } from "@/components/save-button";
import { requireUserId } from "@/lib/auth/session";
import { getJob, listSavedKeys } from "@/lib/db/jobs";
import { formatSalary, freshness } from "@/lib/format";
import { loadCandidateProfile } from "@/lib/matching/feed";
import { jobKey, normalizeJob } from "@/lib/matching/job";
import { scoreJob } from "@/lib/matching/score";
import { ROLE_LABELS, SENIORITY_LABELS, skillLabel } from "@/lib/matching/taxonomy";
import { toParagraphs } from "@/lib/matching/text";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

const WORK_MODE_LABELS = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
} as const;

export default async function JobDetailPage(props: PageProps<"/jobs/[source]/[id]">) {
  const userId = await requireUserId();
  const { source, id } = await props.params;

  const row = await getJob(decodeURIComponent(source), decodeURIComponent(id));
  if (!row) {
    notFound();
  }

  const profile = await loadCandidateProfile(userId);
  if (!profile) {
    redirect("/home");
  }

  const savedKeys = await listSavedKeys(userId);
  const job = normalizeJob(row);
  const match = scoreJob(profile, job);
  const saved = savedKeys.has(jobKey(job.source, job.id));

  const posted = freshness(job.date);
  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const paragraphs = job.description ? toParagraphs(job.description).slice(0, 40) : [];
  const applyHref = job.applyUrl || job.url;

  const facts = [
    ["Work mode", WORK_MODE_LABELS[job.workMode]],
    ["Location", job.location || "Not stated"],
    ["Level", SENIORITY_LABELS[job.seniority]],
    ["Focus", ROLE_LABELS[job.role]],
    ["Experience asked", job.requiredYears !== null ? `${job.requiredYears}+ years` : "Not stated"],
    ["Salary", salary ?? "Not listed"],
    ["Source", job.source],
  ] as const;

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <Link
          href="/jobs"
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted transition-colors duration-150 hover:text-ink"
        >
          ← Back to matches
        </Link>

        <header className="mt-5 flex flex-wrap items-start gap-5">
          <ScoreBadge score={match.score} />
          <div className="min-w-60 flex-1">
            <h1 className="font-serif text-4xl font-medium leading-tight tracking-tight text-ink">
              {job.position}
            </h1>
            <p className="mt-2 text-[15px] font-semibold tracking-tight text-forest">
              {job.company}
            </p>
            {posted ? (
              <p className="mt-2 font-mono text-[11px] text-faint">
                {posted.label}
                {posted.stale ? " · this listing may already be closed" : ""}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <SaveButton
              source={job.source}
              id={job.id}
              matchScore={match.score}
              saved={saved}
              variant="full"
            />
            {applyHref ? (
              <a
                href={applyHref}
                target="_blank"
                rel="noreferrer"
                className="rounded-[10px] bg-forest px-4 py-3 text-sm font-semibold tracking-tight text-paper transition-colors duration-150 hover:bg-forest-bright"
              >
                Apply
              </a>
            ) : null}
          </div>
        </header>

        <section className="mt-8 rounded-[14px] border border-line bg-card p-6">
          <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-forest">
            Why this matches you
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-text">{match.summary}</p>

          {match.matchedSkills.length > 0 ? (
            <div className="mt-5">
              <h3 className="text-sm font-semibold tracking-tight text-ink">Your strengths here</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {match.matchedSkills.map((skillId) => (
                  <span
                    key={skillId}
                    className="rounded-full bg-forest-soft px-2.5 py-1 text-xs font-medium tracking-tight text-forest"
                  >
                    {skillLabel(skillId)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-5">
            <h3 className="text-sm font-semibold tracking-tight text-ink">
              What the posting asks for that your résumé does not show
            </h3>
            <div className="mt-2">
              <GapList gaps={match.missingSkills} />
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
          <section className="rounded-[14px] border border-line bg-card p-6">
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-forest">
              Score breakdown
            </h2>
            <div className="mt-4">
              <ScoreBreakdown dimensions={match.dimensions} />
            </div>
            <p className="mt-5 border-t border-line pt-4 text-[13px] leading-relaxed text-muted">
              Scores come from a transparent weighted model over your résumé and this posting. They
              are a guide to where to spend attention, not a precise measurement.
            </p>
          </section>

          <aside className="rounded-[14px] border border-line bg-card p-6">
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-forest">
              The role
            </h2>
            <dl className="mt-4 space-y-3">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-sm tracking-tight text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            {job.tags.length > 0 ? (
              <div className="mt-5 border-t border-line pt-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">Tags</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {job.tags.slice(0, 12).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-line-strong px-2.5 py-1 text-xs tracking-tight text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {job.url ? (
              <a
                href={job.url}
                target="_blank"
                rel="noreferrer"
                className="mt-5 block border-t border-line pt-4 text-sm font-semibold tracking-tight text-forest hover:underline"
              >
                View original posting
              </a>
            ) : null}
          </aside>
        </div>

        {paragraphs.length > 0 ? (
          <section className="mt-6 rounded-[14px] border border-line bg-card p-6">
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-forest">
              Job description
            </h2>
            <div className="mt-4 space-y-3">
              {paragraphs.map((paragraph, index) => (
                <p key={index} className="text-[15px] leading-relaxed text-text">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
