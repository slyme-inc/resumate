import { FirstRunTour } from "@/app/home/first-run-tour";
import { AppHeader } from "@/components/app-header";
import { JobCard } from "@/components/job-card";
import { JobFilters, type FilterValues } from "@/components/job-filters";
import { JobsListSkeleton, JobsSessionSkeleton } from "@/components/skeletons";
import { requireUserId } from "@/lib/auth/session";
import { listSavedKeys } from "@/lib/db/jobs";
import {
  loadCandidateProfile,
  loadFeedList,
  type FeedFilters,
} from "@/lib/matching/feed";
import type { WorkMode } from "@/lib/matching/extract";
import { SENIORITY_LABELS, type SeniorityLevel } from "@/lib/matching/taxonomy";
import { redirect } from "next/navigation";
import { Suspense } from "react";

const WORK_MODES = new Set<WorkMode>(["remote", "hybrid", "onsite"]);
const PAGE_SIZE = 25;

export const maxDuration = 30;

function first(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function filtersFromValues(values: FilterValues): FeedFilters {
  return {
    query: values.q || null,
    workMode: WORK_MODES.has(values.mode as WorkMode) ? (values.mode as WorkMode) : null,
    seniority: values.seniority in SENIORITY_LABELS ? (values.seniority as SeniorityLevel) : null,
    minScore: values.min ? Number.parseInt(values.min, 10) : null,
  };
}

function valuesFromSearchParams(searchParams: { q?: string | string[]; mode?: string | string[]; seniority?: string | string[]; min?: string | string[] }): FilterValues {
  return {
    q: first(searchParams.q),
    mode: first(searchParams.mode),
    seniority: first(searchParams.seniority),
    min: first(searchParams.min),
  };
}

async function JobsFeed({ userId, values }: { userId: string; values: FilterValues }) {
  const [profile, savedKeys] = await Promise.all([
    loadCandidateProfile(userId),
    listSavedKeys(userId),
  ]);

  if (!profile) {
    redirect("/onboarding");
  }

  const { items, total } = await loadFeedList(
    userId,
    profile,
    savedKeys,
    filtersFromValues(values),
  );
  const visible = items.slice(0, PAGE_SIZE);
  const strong = items.filter((item) => item.match.score >= 80).length;

  return (
    <>
      <div className="mt-6 flex items-baseline justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          {total === 0 ? "No matches" : `Showing ${visible.length} of ${total}`}
          {strong > 0 ? ` · ${strong} ${strong === 1 ? "strong fit" : "strong fits"}` : ""}
        </p>
      </div>

      {total === 0 ? (
        <div className="mt-4 rounded-[14px] border border-line bg-card px-6 py-12 text-center">
          <p className="text-[15px] leading-relaxed text-muted">
            No roles matched these filters. Try widening the work mode or clearing the search.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {visible.map((item) => (
            <JobCard key={item.key} item={item} />
          ))}
        </div>
      )}

      {total > visible.length ? (
        <p className="mt-6 text-center font-mono text-[11px] text-faint">
          Narrow the filters to surface more of the {total - visible.length} remaining roles.
        </p>
      ) : null}
    </>
  );
}

async function JobsSession({
  searchParams,
}: {
  searchParams: PageProps<"/jobs">["searchParams"];
}) {
  const [params, userId] = await Promise.all([searchParams, requireUserId()]);
  const values = valuesFromSearchParams(params);
  const hasFilters = Object.values(values).some(Boolean);

  return (
    <>
      <div className="mt-8">
        <JobFilters values={values} hasFilters={hasFilters} />
      </div>
      <Suspense fallback={<JobsListSkeleton />}>
        <JobsFeed userId={userId} values={values} />
      </Suspense>
    </>
  );
}

export default function JobsPage(props: PageProps<"/jobs">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <h1 className="font-serif text-4xl font-medium tracking-tight text-ink">
          Roles ranked to you
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
          Scored against required vs preferred skills on each posting, then reranked with Gemini on
          the shortlist.
        </p>

        <Suspense fallback={<JobsSessionSkeleton />}>
          <JobsSession searchParams={props.searchParams} />
        </Suspense>
      </main>
      <FirstRunTour />
    </div>
  );
}
