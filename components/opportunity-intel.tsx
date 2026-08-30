"use client";

import { OpportunityIntelSkeleton } from "@/components/skeletons";
import type { OpportunityInsight } from "@/lib/ai/types";
import type { ReactNode } from "react";

const SEVERITY: Record<string, string> = {
  significant: "border-danger/40 text-danger",
  moderate: "border-gold/50 text-gold",
  minor: "border-line-strong text-muted",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[14px] border border-line bg-card p-6">
      <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-forest">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function List({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-[15px] leading-relaxed text-muted">{empty}</p>;
  }
  return (
    <ul className="space-y-2 text-[15px] leading-relaxed text-text">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function OpportunityIntel({
  insight,
  loading,
  error,
}: {
  insight: OpportunityInsight | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return <OpportunityIntelSkeleton />;
  }

  if (error || !insight) {
    return (
      <section className="rounded-[14px] border border-line bg-card p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-forest">
          Opportunity intelligence
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          {error ?? "Advice is unavailable for this role."} The score above still comes from the
          transparent matching model.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <Section title="Why this matches you">
        <p className="text-[15px] leading-relaxed text-text">{insight.whyFit}</p>
        {insight.strengths.length > 0 ? (
          <div className="mt-4">
            <h3 className="text-sm font-semibold tracking-tight text-ink">Your strengths here</h3>
            <ul className="mt-2 space-y-2 text-[15px] leading-relaxed text-text">
              {insight.strengths.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {insight.gaps.length > 0 ? (
          <div className="mt-4">
            <h3 className="text-sm font-semibold tracking-tight text-ink">What you may be missing</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {insight.gaps.map((gap) => (
                <li
                  key={`${gap.label}-${gap.severity}`}
                  className={`rounded-full border px-3 py-1 text-xs font-medium tracking-tight ${SEVERITY[gap.severity] ?? SEVERITY.minor}`}
                  title={gap.note}
                >
                  {gap.label}
                  <span className="ml-1.5 font-mono text-[10px] uppercase tracking-[0.12em] opacity-70">
                    {gap.severity}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>

      <Section title="How to approach">
        <ol className="list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-text">
          {insight.approach.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        {insight.approach.note ? (
          <p className="mt-3 text-[13px] leading-relaxed text-muted">{insight.approach.note}</p>
        ) : null}
      </Section>

      {insight.companyFromPosting ? (
        <Section title="Company, from the posting">
          <p className="text-[15px] leading-relaxed text-text">{insight.companyFromPosting}</p>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            Fact from the job description, not private company data
          </p>
        </Section>
      ) : null}

      {insight.resumeFit.emphasize.length > 0 || insight.resumeFit.missing.length > 0 ? (
        <Section title="What to watch on the résumé">
          {insight.resumeFit.emphasize.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-ink">Emphasize</h3>
              <List items={insight.resumeFit.emphasize} empty="" />
            </div>
          ) : null}
          {insight.resumeFit.missing.length > 0 ? (
            <div className="mt-4">
              <h3 className="text-sm font-semibold tracking-tight text-ink">
                Shown in your work, understated on the page
              </h3>
              <List items={insight.resumeFit.missing} empty="" />
            </div>
          ) : null}
        </Section>
      ) : null}
    </div>
  );
}
