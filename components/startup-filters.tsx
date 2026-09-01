import type { StartupNewsKind } from "@/lib/db/startups";
import Link from "next/link";

export type StartupFilterValues = {
  q: string;
  kind: StartupNewsKind;
  batch: string;
};

const LABEL_CLASS =
  "block font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted";

export function startupsHref(values: StartupFilterValues, page = 1) {
  const query: Record<string, string> = {};
  if (values.kind === "yc") query.kind = "yc";
  if (values.batch) query.batch = values.batch;
  if (values.q) query.q = values.q;
  if (page > 1) query.page = String(page);
  return Object.keys(query).length > 0 ? { pathname: "/startups" as const, query } : "/startups";
}

export function StartupFilters({
  values,
  hasFilters,
}: {
  values: StartupFilterValues;
  hasFilters: boolean;
}) {
  const fundingActive = values.kind === "funding";
  const ycActive = values.kind === "yc";

  return (
    <div className="rounded-[14px] border border-line bg-card p-5">
      <div className="flex flex-wrap items-center gap-1">
        <Link
          href={startupsHref({ ...values, kind: "funding", batch: "" })}
          aria-current={fundingActive ? "page" : undefined}
          className={`rounded-[10px] px-3 py-2 text-sm font-semibold tracking-tight transition-colors duration-150 ${
            fundingActive ? "bg-forest-soft text-forest" : "text-muted hover:text-ink"
          }`}
        >
          Funding
        </Link>
        <Link
          href={startupsHref({ ...values, kind: "yc", batch: "" })}
          aria-current={ycActive ? "page" : undefined}
          className={`rounded-[10px] px-3 py-2 text-sm font-semibold tracking-tight transition-colors duration-150 ${
            ycActive ? "bg-forest-soft text-forest" : "text-muted hover:text-ink"
          }`}
        >
          YC batches
        </Link>
      </div>

      <form method="get" action="/startups" className="mt-4">
        {values.kind === "yc" ? <input type="hidden" name="kind" value="yc" /> : null}
        {values.batch ? <input type="hidden" name="batch" value={values.batch} /> : null}
        <label className={LABEL_CLASS} htmlFor="q">
          Search
        </label>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={values.q}
            placeholder={values.kind === "yc" ? "Company or industry…" : "Pinegap, climate, fintech…"}
            className="min-w-0 flex-1 rounded-[10px] border border-line-strong bg-card px-3 py-2.5 text-sm tracking-tight text-ink outline-none placeholder:text-faint focus:border-forest"
          />
          {hasFilters ? (
            <Link
              href={startupsHref({ q: "", kind: values.kind, batch: values.batch })}
              className="rounded-[10px] px-3 py-2.5 text-sm font-semibold tracking-tight text-muted transition-colors duration-150 hover:text-ink"
            >
              Clear
            </Link>
          ) : null}
          <button
            type="submit"
            className="cursor-pointer rounded-[10px] bg-forest px-4 py-2.5 text-sm font-semibold tracking-tight text-paper transition-colors duration-150 hover:bg-forest-bright"
          >
            Search
          </button>
        </div>
      </form>
    </div>
  );
}
