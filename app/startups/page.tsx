import { AppHeader } from "@/components/app-header";
import { PreviewFrame } from "@/components/link-preview-card";
import { StartupSessionSkeleton } from "@/components/skeletons";
import {
  StartupFilters,
  startupsHref,
  type StartupFilterValues,
} from "@/components/startup-filters";
import { STARTUP_NEWS_GRID, StartupNewsCard } from "@/components/startup-news-card";
import { requireUserId } from "@/lib/auth/session";
import {
  isRecentYcBatch,
  listFundingNews,
  listRecentYcNews,
  listYcBatchCompanies,
  listYcBatches,
  type StartupNewsItem,
  type StartupNewsKind,
} from "@/lib/db/startups";
import Link from "next/link";
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
  kind?: string | string[];
  batch?: string | string[];
}): StartupFilterValues {
  const kind: StartupNewsKind = first(searchParams.kind) === "yc" ? "yc" : "funding";
  const batch = kind === "yc" ? first(searchParams.batch) : "";
  return {
    q: first(searchParams.q),
    kind,
    batch: isRecentYcBatch(batch) ? batch : "",
  };
}

function NewsPagination({
  page,
  pageCount,
  values,
}: {
  page: number;
  pageCount: number;
  values: StartupFilterValues;
}) {
  if (pageCount <= 1) {
    return null;
  }

  return (
    <nav aria-label="News pages" className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={startupsHref(values, page - 1)} className={`${PAGE_BTN} border-line-strong text-ink hover:bg-card`}>
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
        <Link href={startupsHref(values, page + 1)} className={`${PAGE_BTN} border-line-strong text-ink hover:bg-card`}>
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

function EmptyNews({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-[14px] border border-line bg-card px-6 py-12 text-center">
      <p className="text-[15px] leading-relaxed text-muted">{message}</p>
    </div>
  );
}

function NewsList({
  items,
  total,
  page,
  pageSize,
  pageCount,
  values,
  empty,
}: {
  items: StartupNewsItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  values: StartupFilterValues;
  empty: string;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = (page - 1) * pageSize + items.length;

  return (
    <>
      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          {total === 0
            ? "No announcements"
            : `${values.batch ? `${values.batch} · ` : ""}Showing ${from}–${to} of ${total}`}
        </p>
        {values.batch ? (
          <Link
            href={startupsHref({ q: values.q, kind: "yc", batch: "" })}
            className="text-sm font-semibold tracking-tight text-forest hover:underline"
          >
            All recent batches
          </Link>
        ) : null}
      </div>
      {total === 0 ? (
        <EmptyNews message={empty} />
      ) : (
        <div className={STARTUP_NEWS_GRID}>
          {items.map((item) => (
            <StartupNewsCard key={`${item.source}:${item.id}`} item={item} />
          ))}
        </div>
      )}
      <NewsPagination page={page} pageCount={pageCount} values={values} />
    </>
  );
}

async function FundingNews({
  values,
  page,
}: {
  values: StartupFilterValues;
  page: number;
}) {
  const result = await listFundingNews({ query: values.q, page });
  return (
    <NewsList
      {...result}
      values={values}
      empty="No public funding announcements matched that search."
    />
  );
}

async function RecentYcNews({
  values,
  page,
}: {
  values: StartupFilterValues;
  page: number;
}) {
  const result = await listRecentYcNews({ query: values.q, page });
  return (
    <NewsList
      {...result}
      values={values}
      empty="No recent YC companies matched that search."
    />
  );
}

async function YcBatchIndex() {
  const batches = await listYcBatches();
  if (batches.length === 0) {
    return <EmptyNews message="No recent YC batches in the directory yet." />;
  }

  return (
    <>
      <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        {batches.length} recent {batches.length === 1 ? "batch" : "batches"}
      </p>
      <div className={STARTUP_NEWS_GRID}>
        {batches.map((batch) => (
          <PreviewFrame
            key={batch.ycBatch}
            href={startupsHref({ q: "", kind: "yc", batch: batch.ycBatch })}
            title={batch.ycBatch}
            tag={`${batch.companies} ${batch.companies === 1 ? "company" : "companies"}`}
            external={false}
          />
        ))}
      </div>
    </>
  );
}

async function YcBatchFeed({
  values,
  page,
}: {
  values: StartupFilterValues;
  page: number;
}) {
  const result = await listYcBatchCompanies({
    batch: values.batch,
    query: values.q,
    page,
  });

  return (
    <NewsList
      {...result}
      values={values}
      empty="No companies in this batch matched that search."
    />
  );
}

async function StartupFeed({
  values,
  page,
}: {
  values: StartupFilterValues;
  page: number;
}) {
  if (values.kind === "yc") {
    if (values.batch) {
      return YcBatchFeed({ values, page });
    }
    if (values.q) {
      return RecentYcNews({ values, page });
    }
    return YcBatchIndex();
  }
  return FundingNews({ values, page });
}

async function StartupSession({
  searchParams,
}: {
  searchParams: PageProps<"/startups">["searchParams"];
}) {
  const [params] = await Promise.all([searchParams, requireUserId()]);
  const values = valuesFromSearchParams(params);
  const page = pageFromSearchParams(params.page);
  const hasFilters = Boolean(values.q);

  return (
    <>
      <div className="mt-8">
        <StartupFilters values={values} hasFilters={hasFilters} />
      </div>
      {await StartupFeed({ values, page })}
    </>
  );
}

export default function StartupsPage(props: PageProps<"/startups">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-forest">
          Startup discovery
        </p>
        <h1 className="mt-2 font-serif text-4xl font-medium tracking-tight text-ink">Startup news</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
          Public funding announcements and recent YC batches. This list is the same for everyone — it
          is not scored against your résumé.
        </p>
        <Suspense fallback={<StartupSessionSkeleton />}>
          <StartupSession searchParams={props.searchParams} />
        </Suspense>
      </main>
    </div>
  );
}
