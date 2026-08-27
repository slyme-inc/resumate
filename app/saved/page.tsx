import { AppHeader } from "@/components/app-header";
import { JobCard } from "@/components/job-card";
import { requireUserId } from "@/lib/auth/session";
import { listSavedJobs } from "@/lib/db/jobs";
import { loadCandidateProfile } from "@/lib/matching/feed";
import { jobKey, normalizeJob } from "@/lib/matching/job";
import { scoreJob } from "@/lib/matching/score";
import Link from "next/link";

export default async function SavedPage() {
  const userId = await requireUserId();
  const [profile, rows] = await Promise.all([
    loadCandidateProfile(userId),
    listSavedJobs(userId),
  ]);

  const items = profile
    ? rows.map((row) => {
        const job = normalizeJob(row.job);
        return {
          key: jobKey(job.source, job.id),
          job,
          match: scoreJob(profile, job),
          saved: true,
          savedScore: row.matchScore,
        };
      })
    : [];

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <h1 className="font-serif text-4xl font-medium tracking-tight text-ink">Saved</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          {rows.length === 0
            ? "Roles you save are kept here with the score they had at the time."
            : `${rows.length} saved ${rows.length === 1 ? "role" : "roles"}.`}
        </p>

        {rows.length === 0 ? (
          <div className="mt-8 rounded-[14px] border border-line bg-card px-6 py-12 text-center">
            <p className="text-[15px] leading-relaxed text-muted">Nothing saved yet.</p>
            <Link
              href="/jobs"
              className="mt-5 inline-block rounded-[10px] bg-forest px-4 py-3 text-sm font-semibold tracking-tight text-paper transition-colors duration-150 hover:bg-forest-bright"
            >
              Browse matches
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {items.map((item) => (
              <div key={item.key}>
                <JobCard item={item} />
                {item.savedScore !== null && item.savedScore !== item.match.score ? (
                  <p className="mt-1.5 pl-5 font-mono text-[11px] text-faint">
                    Scored {item.savedScore}% when you saved it.
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
