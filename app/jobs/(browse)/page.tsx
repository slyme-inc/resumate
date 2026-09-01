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
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

const WORK_MODES = new Set<WorkMode>(["remote", "hybrid", "onsite"]);
const PAGE_SIZE = 25;

export const maxDuration = 30;

function first(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function pageFromSearchParams(value: string | string[] | undefined) {
  const parsed = Number.parseInt(first(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function filtersFromValues(values: FilterValues): FeedFilters {
  return {
    query: values.q || null,
    workMode: WORK_MODES.has(values.mode as WorkMode) ? (values.mode as WorkMode) : null,
    seniority: values.seniority in SENIORITY_LABELS ? (values.seniority as SeniorityLevel) : null,
    minScore: values.min ? Number.parseInt(values.min, 10) : null,
  };
}

function valuesFromSearchParams(searchParams: {
  q?: string | string[];
  mode?: string | string[];
  seniority?: string | string[];
  min?: string | string[];
}): FilterValues {
  return {
    q: first(searchParams.q),
    mode: first(searchParams.mode),
    seniority: first(searchParams.seniority),
    min: first(searchParams.min),
  };
}

function jobsListHref(values: FilterValues, page: number) {
  const query: Record<string, string> = {};
  if (values.q) query.q = values.q;
  if (values.mode) query.mode = values.mode;
  if (values.seniority) query.seniority = values.seniority;
  if (values.min) query.min = values.min;
  if (page > 1) query.page = String(page);
  return Object.keys(query).length > 0 ? { pathname: "/jobs" as const, query } : "/jobs";
}

const PAGE_BTN =
  "inline-flex min-w-10 items-center justify-center rounded-[10px] border px-3 py-2 text-sm font-semibold tracking-tight transition-colors duration-150";

function JobsPagination({
  page,
  pageCount,
  values,
}: {
  page: number;
  pageCount: number;
  values: FilterValues;
}) {
  if (pageCount <= 1) {
    return null;
  }

  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  return (
    <nav aria-label="Job list pages" className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={jobsListHref(values, page - 1)} className={`${PAGE_BTN} border-line-strong text-ink hover:bg-card`}>
          Previous
        </Link>
      ) : (
        <span className={`${PAGE_BTN} border-line text-faint`} aria-disabled="true">
          Previous
        </span>
      )}

      <ol className="flex flex-wrap items-center justify-center gap-1">
        {pages.map((number) => (
          <li key={number}>
            {number === page ? (
              <span aria-current="page" className={`${PAGE_BTN} border-forest bg-forest text-paper`}>
                {number}
              </span>
            ) : (
              <Link
                href={jobsListHref(values, number)}
                aria-label={`Page ${number}`}
                className={`${PAGE_BTN} border-line-strong text-ink hover:bg-card`}
              >
                {number}
              </Link>
            )}
          </li>
        ))}
      </ol>

      {page < pageCount ? (
        <Link href={jobsListHref(values, page + 1)} className={`${PAGE_BTN} border-line-strong text-ink hover:bg-card`}>
          Next
        </Link>
      ) : (
        <span className={`${PAGE_BTN} border-line text-faint`} aria-disabled="true">
          Next
        </span>
      )}
    </nav>
  );
}

async function JobsFeed({
  userId,
  values,
  page: requestedPage,
}: {
  userId: string;
  values: FilterValues;
  page: number;
}) {
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
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const start = (page - 1) * PAGE_SIZE;
  const visible = items.slice(start, start + PAGE_SIZE);
  const from = total === 0 ? 0 : start + 1;
  const to = start + visible.length;
  const strong = items.filter((item) => item.match.score >= 80).length;

  return (
    <>
      <div className="mt-6 flex items-baseline justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          {total === 0 ? "No matches" : `Showing ${from}–${to} of ${total}`}
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

      <JobsPagination page={page} pageCount={pageCount} values={values} />
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
  const page = pageFromSearchParams(params.page);
  const hasFilters = Object.values(values).some(Boolean);

  return (
    <>
      <div className="mt-8">
        <JobFilters values={values} hasFilters={hasFilters} />
      </div>
      <Suspense fallback={<JobsListSkeleton />}>
        <JobsFeed userId={userId} values={values} page={page} />
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
