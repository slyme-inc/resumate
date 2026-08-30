import type { CandidateProfile } from "@/lib/profile/types";
import { ROLE_LABELS, SENIORITY_LABELS } from "@/lib/matching/taxonomy";
import Link from "next/link";

export function ProfileSummary({ profile }: { profile: CandidateProfile }) {
  const facts = [
    ["Level", SENIORITY_LABELS[profile.seniority]],
    [
      "Experience",
      profile.yearsOfExperience !== null ? `~${profile.yearsOfExperience} years` : "Not detected",
    ],
    ["Focus", profile.roles.map((role) => ROLE_LABELS[role]).join(" · ")],
  ] as const;

  return (
    <section className="border-b border-line bg-surface px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {facts.map(([label, value]) => (
            <div key={label}>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                {label}
              </p>
              <p className="text-sm font-semibold tracking-tight text-ink">{value}</p>
            </div>
          ))}
          {profile.primarySkills.length > 0 ? (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                Core stack
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {profile.primarySkills.slice(0, 8).map((skill) => (
                  <span
                    key={skill.id}
                    className="rounded-full bg-forest-soft px-2.5 py-0.5 text-xs font-medium tracking-tight text-forest"
                  >
                    {skill.label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/profile"
            className="rounded-[10px] border border-line-strong px-4 py-2.5 text-sm font-semibold tracking-tight text-ink transition-colors duration-150 hover:bg-card"
          >
            Review profile
          </Link>
          <Link
            href="/jobs"
            className="rounded-[10px] bg-forest px-4 py-2.5 text-sm font-semibold tracking-tight text-paper transition-colors duration-150 hover:bg-forest-bright"
          >
            See your matches
          </Link>
        </div>
      </div>
      <p className="mt-3 font-mono text-[10px] text-faint">
        Derived from your résumé. Review and correct it on your profile.
      </p>
    </section>
  );
}
