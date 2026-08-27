import { SENIORITY_LABELS } from "@/lib/matching/taxonomy";
import Link from "next/link";

export type FilterValues = {
  q: string;
  mode: string;
  seniority: string;
  source: string;
  min: string;
};

const SELECT_CLASS =
  "w-full cursor-pointer appearance-none rounded-[10px] border border-line-strong bg-card px-3 py-2.5 text-sm font-medium tracking-tight text-ink outline-none focus:border-forest";

const LABEL_CLASS =
  "block font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted";

export function JobFilters({
  values,
  sources,
  hasFilters,
}: {
  values: FilterValues;
  sources: { source: string; count: number }[];
  hasFilters: boolean;
}) {
  return (
    <form method="get" action="/jobs" className="rounded-[14px] border border-line bg-card p-5">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label className={LABEL_CLASS} htmlFor="q">
            Search
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={values.q}
            placeholder="React Native, platform engineer…"
            className="mt-1.5 w-full rounded-[10px] border border-line-strong bg-card px-3 py-2.5 text-sm tracking-tight text-ink outline-none placeholder:text-faint focus:border-forest"
          />
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="mode">
            Work mode
          </label>
          <select id="mode" name="mode" defaultValue={values.mode} className={`mt-1.5 ${SELECT_CLASS}`}>
            <option value="">Any</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
          </select>
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="seniority">
            Level
          </label>
          <select
            id="seniority"
            name="seniority"
            defaultValue={values.seniority}
            className={`mt-1.5 ${SELECT_CLASS}`}
          >
            <option value="">Any</option>
            {Object.entries(SENIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="source">
            Source
          </label>
          <select
            id="source"
            name="source"
            defaultValue={values.source}
            className={`mt-1.5 ${SELECT_CLASS}`}
          >
            <option value="">All sources</option>
            {sources.map((entry) => (
              <option key={entry.source} value={entry.source}>
                {entry.source} ({entry.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div className="w-40">
          <label className={LABEL_CLASS} htmlFor="min">
            Minimum match
          </label>
          <select id="min" name="min" defaultValue={values.min} className={`mt-1.5 ${SELECT_CLASS}`}>
            <option value="">Any score</option>
            <option value="60">60% and up</option>
            <option value="70">70% and up</option>
            <option value="80">80% and up</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {hasFilters ? (
            <Link
              href="/jobs"
              className="rounded-[10px] px-3 py-2.5 text-sm font-semibold tracking-tight text-muted transition-colors duration-150 hover:text-ink"
            >
              Clear
            </Link>
          ) : null}
          <button
            type="submit"
            className="cursor-pointer rounded-[10px] bg-forest px-4 py-2.5 text-sm font-semibold tracking-tight text-paper transition-colors duration-150 hover:bg-forest-bright"
          >
            Apply filters
          </button>
        </div>
      </div>
    </form>
  );
}
