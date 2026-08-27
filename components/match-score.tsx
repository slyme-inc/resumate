import type { MatchDimension, SkillGap } from "@/lib/matching/score";

export function scoreTone(score: number) {
  if (score >= 80) {
    return { text: "text-forest", bg: "bg-forest", soft: "bg-forest-soft" };
  }
  if (score >= 60) {
    return { text: "text-gold", bg: "bg-gold", soft: "bg-gold/15" };
  }
  return { text: "text-muted", bg: "bg-line-strong", soft: "bg-line/60" };
}

export function ScoreBadge({ score }: { score: number }) {
  const tone = scoreTone(score);
  return (
    <div className={`flex shrink-0 flex-col items-center rounded-[10px] ${tone.soft} px-3 py-2`}>
      <span className={`font-serif text-2xl font-medium leading-none ${tone.text}`}>{score}</span>
      <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        match
      </span>
    </div>
  );
}

export function ScoreBreakdown({ dimensions }: { dimensions: MatchDimension[] }) {
  return (
    <dl className="space-y-3">
      {dimensions.map((dimension) => {
        const percent = Math.round(dimension.score * 100);
        const tone = scoreTone(percent);
        return (
          <div key={dimension.key}>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-sm font-semibold tracking-tight text-ink">
                {dimension.label}
              </dt>
              <dd className="font-mono text-xs text-muted">
                {percent}%
                <span className="ml-2 text-faint">
                  ×{dimension.weight.toFixed(2)}
                </span>
              </dd>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line/70">
              <div
                className={`h-full rounded-full ${tone.bg}`}
                style={{ width: `${Math.max(percent, 2)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{dimension.detail}</p>
          </div>
        );
      })}
    </dl>
  );
}

const SEVERITY_STYLE: Record<SkillGap["severity"], string> = {
  significant: "border-danger/40 text-danger",
  moderate: "border-gold/50 text-gold",
  minor: "border-line-strong text-muted",
};

export function GapList({ gaps }: { gaps: SkillGap[] }) {
  if (gaps.length === 0) {
    return (
      <p className="text-[15px] leading-relaxed text-muted">
        Nothing named in this posting is missing from your résumé.
      </p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {gaps.map((gap) => (
        <li
          key={gap.id}
          className={`rounded-full border px-3 py-1 text-xs font-medium tracking-tight ${SEVERITY_STYLE[gap.severity]}`}
        >
          {gap.label}
          <span className="ml-1.5 font-mono text-[10px] uppercase tracking-[0.12em] opacity-70">
            {gap.severity}
          </span>
        </li>
      ))}
    </ul>
  );
}
