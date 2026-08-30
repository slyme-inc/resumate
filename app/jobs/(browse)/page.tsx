import { AppHeader } from "@/components/app-header";
import { JobCard } from "@/components/job-card";
import { JobFilters, type FilterValues } from "@/components/job-filters";
import { requireUserId } from "@/lib/auth/session";
import { countSavedJobs, listSavedKeys, listSources } from "@/lib/db/jobs";
import {
  countPostedWithin,
  loadCandidateProfile,
  loadFeed,
  withoutDescriptions,
  type FeedFilters,
} from "@/lib/matching/feed";
import type { WorkMode } from "@/lib/matching/extract";
import { SENIORITY_LABELS, type SeniorityLevel } from "@/lib/matching/taxonomy";
import Link from "next/link";

const WORK_MODES = new Set<WorkMode>(["remote", "hybrid", "onsite"]);
const PAGE_SIZE = 25;

function first(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default async function JobsPage(props: PageProps<"/jobs">) {
  const userId = await requireUserId();
  const searchParams = await props.searchParams;

  const values: FilterValues = {
    q: first(searchParams.q),
    mode: first(searchParams.mode),
    seniority: first(searchParams.seniority),
    source: first(searchParams.source),
    min: first(searchParams.min),
  };

  const profilePromise = loadCandidateProfile(userId);
  const savedKeysPromise = listSavedKeys(userId);
  const sourcesPromise = listSources();
  const savedCountPromise = countSavedJobs(userId);

  const [profile, savedKeys] = await Promise.all([profilePromise, savedKeysPromise]);

  if (!profile) {
    return (
      <div className="flex min-h-dvh flex-col">
        <AppHeader />
        <main className="flex flex-1 items-center justify-center px-6 py-16">
          <div className="max-w-md text-center">
            <h1 className="font-serif text-4xl font-medium tracking-tight text-ink">
              Upload a résumé first
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              Matching is built from your own experience, so there is nothing to rank until we
              have read your résumé.
            </p>
            <Link
              href="/home"
              className="mt-6 inline-block rounded-[10px] bg-forest px-4 py-3 text-sm font-semibold tracking-tight text-paper transition-colors duration-150 hover:bg-forest-bright"
            >
              Upload résumé
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const filters: FeedFilters = {
    query: values.q || null,
    source: values.source || null,
    workMode: WORK_MODES.has(values.mode as WorkMode) ? (values.mode as WorkMode) : null,
    seniority: values.seniority in SENIORITY_LABELS ? (values.seniority as SeniorityLevel) : null,
    minScore: values.min ? Number.parseInt(values.min, 10) : null,
  };

  const [results, sources, savedCount] = await Promise.all([
    loadFeed(profile, savedKeys, filters),
    sourcesPromise,
    savedCountPromise,
  ]);
  const visible = withoutDescriptions(results.slice(0, PAGE_SIZE));
  const strong = results.filter((item) => item.match.score >= 80).length;
  const hasFilters = Object.values(values).some(Boolean);

  const stats = [
    { label: "High-fit roles", value: strong },
    { label: "New this week", value: countPostedWithin(results, 7) },
    { label: "Saved", value: savedCount },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <h1 className="font-serif text-4xl font-medium tracking-tight text-ink">
          Roles ranked to you
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
          Scored against your {profile.primarySkills.slice(0, 3).map((s) => s.label).join(", ")}
          {profile.primarySkills.length > 3 ? " and related" : ""} experience.{" "}
          {strong > 0
            ? `${strong} ${strong === 1 ? "role is" : "roles are"} a strong fit.`
            : "Nothing scores above 80% right now."}
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-[14px] border border-line bg-card px-5 py-4">
              <p className="font-serif text-3xl font-medium leading-none text-ink">{stat.value}</p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <JobFilters values={values} sources={sources} hasFilters={hasFilters} />
        </div>

        <div className="mt-6 flex items-baseline justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            {results.length === 0
              ? "No matches"
              : `Showing ${visible.length} of ${results.length}`}
          </p>
        </div>

        {results.length === 0 ? (
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

        {results.length > visible.length ? (
          <p className="mt-6 text-center font-mono text-[11px] text-faint">
            Narrow the filters to surface more of the {results.length - visible.length} remaining
            roles.
          </p>
        ) : null}
      </main>
    </div>
  );
}
