import Link from "next/link";

export type OssFilterValues = {
  q: string;
  language: string;
};

const SELECT_CLASS =
  "w-full cursor-pointer appearance-none rounded-[10px] border border-line-strong bg-card px-3 py-2.5 text-sm font-medium tracking-tight text-ink outline-none focus:border-forest";

const LABEL_CLASS =
  "block font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted";

export function ossHref(values: OssFilterValues, page = 1) {
  const query: Record<string, string> = {};
  if (values.q) query.q = values.q;
  if (values.language) query.language = values.language;
  if (page > 1) query.page = String(page);
  return Object.keys(query).length > 0 ? { pathname: "/open-source" as const, query } : "/open-source";
}

export function OssFilters({
  values,
  languages,
  hasFilters,
}: {
  values: OssFilterValues;
  languages: { language: string; repos: number }[];
  hasFilters: boolean;
}) {
  return (
    <form method="get" action="/open-source" className="rounded-[14px] border border-line bg-card p-5">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className={LABEL_CLASS} htmlFor="q">
            Search
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={values.q}
            placeholder="Repo, company, language…"
            className="mt-1.5 w-full rounded-[10px] border border-line-strong bg-card px-3 py-2.5 text-sm tracking-tight text-ink outline-none placeholder:text-faint focus:border-forest"
          />
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="language">
            Language
          </label>
          <select
            id="language"
            name="language"
            defaultValue={values.language}
            className={`mt-1.5 ${SELECT_CLASS}`}
          >
            <option value="">Any</option>
            {languages.map((item) => (
              <option key={item.language} value={item.language}>
                {item.language} ({item.repos})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        {hasFilters ? (
          <Link
            href="/open-source"
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
  );
}
