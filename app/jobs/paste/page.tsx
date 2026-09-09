import { AppHeader } from "@/components/app-header";
import { JobCard } from "@/components/job-card";
import { PasteJobForm } from "@/components/paste-job-form";
import { requireResume } from "@/lib/auth/session";
import { listCustomJobs, listSavedKeys } from "@/lib/db/jobs";
import { loadCandidateProfile, withoutDescriptions } from "@/lib/matching/feed";
import { jobKey, normalizeJob } from "@/lib/matching/job";
import { scoreJob } from "@/lib/matching/score";

export default async function PasteJobPage() {
  const { userId } = await requireResume();
  const [profile, savedKeys, customRows] = await Promise.all([
    loadCandidateProfile(userId),
    listSavedKeys(userId),
    listCustomJobs(userId),
  ]);

  const pasted = withoutDescriptions(
    profile
      ? customRows.map((row) => {
          const job = normalizeJob(row);
          return {
            key: jobKey(job.source, job.id),
            job,
            match: scoreJob(profile, job),
            saved: savedKeys.has(jobKey(job.source, job.id)),
          };
        })
      : [],
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <h1 className="font-serif text-4xl font-medium tracking-tight text-ink">
          Paste a job description
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
          Copy a posting from any site we don&apos;t scrape. We&apos;ll score it, explain the fit,
          and suggest résumé edits — same as a listed role.
        </p>

        <div className="mt-8">
          <PasteJobForm />
        </div>

        {pasted.length > 0 ? (
          <section className="mt-10">
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-forest">
              Pasted by you
            </h2>
            <div className="mt-3 space-y-4">
              {pasted.map((item) => (
                <JobCard key={item.key} item={item} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
