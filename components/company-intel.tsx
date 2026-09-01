import { countOpenRoles, getCompanyIntel, type CompanyIntel } from "@/lib/db/company";

export function CompanyIntelCard({
  intel,
  openRoles,
}: {
  intel: CompanyIntel;
  openRoles: number;
}) {
  const links = [
    intel.website ? ["Website", intel.website] : null,
    intel.sourceUrl ? ["YC profile", intel.sourceUrl] : null,
  ].filter((value): value is [string, string] => value !== null);

  return (
    <section className="rounded-[14px] border border-line bg-card p-6">
      <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-forest">
        Company
      </h2>
      <p className="mt-3 text-[15px] font-semibold tracking-tight text-ink">{intel.company}</p>
      <dl className="mt-4 space-y-3">
        {intel.ycBatch ? (
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
              YC batch
            </dt>
            <dd className="mt-0.5 text-sm tracking-tight text-ink">{intel.ycBatch}</dd>
          </div>
        ) : null}
        {intel.industry ? (
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
              Industry
            </dt>
            <dd className="mt-0.5 text-sm tracking-tight text-ink">{intel.industry}</dd>
          </div>
        ) : null}
        {intel.round && intel.round !== "yc" ? (
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
              Last known round
            </dt>
            <dd className="mt-0.5 text-sm tracking-tight text-ink">
              {intel.round}
              {intel.amount ? ` · ${intel.amount}` : ""}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            Open roles we have
          </dt>
          <dd className="mt-0.5 text-sm tracking-tight text-ink">{openRoles}</dd>
        </div>
      </dl>
      {links.length > 0 ? (
        <div className="mt-5 space-y-2 border-t border-line pt-4">
          {links.map(([label, href]) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="block text-sm font-semibold tracking-tight text-forest hover:underline"
            >
              {label}
            </a>
          ))}
        </div>
      ) : null}
      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
        {intel.matchedBy === "yc_slug"
          ? "Joined on YC slug"
          : "Joined on a unique company name"}
      </p>
    </section>
  );
}

export async function CompanyIntelSection({
  company,
  ycSlug,
}: {
  company: string | null;
  ycSlug: string | null;
}) {
  const [intel, openRoles] = await Promise.all([
    getCompanyIntel(company, ycSlug),
    countOpenRoles(company ?? "", ycSlug),
  ]);
  if (!intel) {
    return null;
  }
  return <CompanyIntelCard intel={intel} openRoles={openRoles} />;
}
