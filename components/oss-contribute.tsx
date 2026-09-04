import type { OssContributeGuide } from "@/lib/ai/oss";
import { skillLabel } from "@/lib/matching/taxonomy";
import type { ReactNode } from "react";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[14px] border border-line bg-card p-6">
      <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-forest">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function OssContributeGuideCard({
  guide,
  matchedSkills,
}: {
  guide: OssContributeGuide;
  matchedSkills: string[];
}) {
  return (
    <div className="space-y-6">
      <Section title="How to contribute">
        <p className="text-[15px] leading-relaxed text-text">{guide.overview}</p>
        {guide.gettingStarted.length > 0 ? (
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-text">
            {guide.gettingStarted.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        ) : null}
      </Section>

      <Section title="What you can contribute">
        <p className="text-[15px] leading-relaxed text-text">{guide.resumeFit}</p>
        {matchedSkills.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {matchedSkills.slice(0, 8).map((id) => (
              <span
                key={id}
                className="rounded-full bg-forest-soft px-2.5 py-1 text-xs font-medium tracking-tight text-forest"
              >
                {skillLabel(id)}
              </span>
            ))}
          </div>
        ) : null}
        {guide.contributions.length > 0 ? (
          <ul className="mt-5 space-y-4">
            {guide.contributions.map((item) => (
              <li key={item.title} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
                <h3 className="text-sm font-semibold tracking-tight text-ink">{item.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-text">{item.whyYou}</p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{item.how}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      {guide.watchouts.length > 0 ? (
        <Section title="Watchouts">
          <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-text">
            {guide.watchouts.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
