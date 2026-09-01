import { AppHeader } from "@/components/app-header";
import { OssFilters, ossHref, type OssFilterValues } from "@/components/oss-filters";
import { OssRepoCard } from "@/components/oss-repo-card";
import { OssSessionSkeleton } from "@/components/skeletons";
import { requireUserId } from "@/lib/auth/session";
import { loadCandidateProfile } from "@/lib/matching/feed";
import { loadOssFeed } from "@/lib/oss/feed";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const maxDuration = 30;

const PAGE_BTN =
  "inline-flex min-w-10 items-center justify-center rounded-[10px] border px-3 py-2 text-sm font-semibold tracking-tight transition-colors duration-150";

function first(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function pageFromSearchParams(value: string | string[] | undefined) {
  const parsed = Number.parseInt(first(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function valuesFromSearchParams(searchParams: {
  q?: string | string[];
  language?: string | string[];
}): OssFilterValues {
  return {
    q: first(searchParams.q),
    language: first(searchParams.language),
  };
}

function RepoPagination({
  page,
  pageCount,
  values,
}: {
  page: number;
  pageCount: number;
  values: OssFilterValues;
}) {
  if (pageCount <= 1) {
    return null;
  }

  return (
    <nav aria-label="Repository pages" className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={ossHref(values, page - 1)} className={`${PAGE_BTN} border-line-strong text-ink hover:bg-card`}>
          Previous
        </Link>
      ) : (
        <span className={`${PAGE_BTN} border-line text-faint`} aria-disabled="true">
          Previous
        </span>
      )}
      <p className="px-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        Page {page} of {pageCount}
      </p>
      {page < pageCount ? (
        <Link href={ossHref(values, page + 1)} className={`${PAGE_BTN} border-line-strong text-ink hover:bg-card`}>
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

async function OssSession({
  searchParams,
}: {
  searchParams: PageProps<"/open-source">["searchParams"];
}) {
  const [params, userId] = await Promise.all([searchParams, requireUserId()]);
  const profile = await loadCandidateProfile(userId);
  if (!profile) {
    redirect("/onboarding");
  }

  const values = valuesFromSearchParams(params);
  const result = await loadOssFeed(
    profile,
    { query: values.q, language: values.language },
    pageFromSearchParams(params.page),
  );
  const knownLanguage = result.languages.some((item) => item.language === values.language);
  const filters = {
    q: values.q,
    language: knownLanguage ? values.language : "",
  };
  const hasFilters = Boolean(filters.q || filters.language);
  const from = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const to = (result.page - 1) * result.pageSize + result.items.length;

  return (
    <>
      <div className="mt-8">
        <OssFilters values={filters} languages={result.languages} hasFilters={hasFilters} />
      </div>
      <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        {result.total === 0 ? "No matches" : `Showing ${from}–${to} of ${result.total}`}
        {result.strong > 0
          ? ` · ${result.strong} ${result.strong === 1 ? "strong fit" : "strong fits"}`
          : ""}
      </p>
      {result.total === 0 ? (
        <div className="mt-4 rounded-[14px] border border-line bg-card px-6 py-12 text-center">
          <p className="text-[15px] leading-relaxed text-muted">
            No public repositories overlapped your stack. Try another language or a broader search.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {result.items.map((item) => (
            <OssRepoCard key={item.repo.id} item={item} />
          ))}
        </div>
      )}
      <RepoPagination page={result.page} pageCount={result.pageCount} values={filters} />
    </>
  );
}

export default function OpenSourcePage(props: PageProps<"/open-source">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-forest">
          Open source discovery
        </p>
        <h1 className="mt-2 font-serif text-4xl font-medium tracking-tight text-ink">
          Repos ranked to you
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
          Public GitHub projects from YC companies, scored against the languages and skills on your
          résumé.
        </p>
        <Suspense fallback={<OssSessionSkeleton />}>
          <OssSession searchParams={props.searchParams} />
        </Suspense>
      </main>
    </div>
  );
}
