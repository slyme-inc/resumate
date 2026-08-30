import { ProfileForm } from "@/app/profile/profile-form";
import { AppHeader } from "@/components/app-header";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { requireUserId } from "@/lib/auth/session";
import { getUserResumeAndProfile } from "@/lib/db/profile";
import { heuristicStoredProfile } from "@/lib/profile/hydrate";
import Link from "next/link";

export const maxDuration = 60;

export default async function ProfilePage() {
  const userId = await requireUserId();
  const { resume, profile } = await getUserResumeAndProfile(userId);

  if (!resume) {
    return (
      <div className="flex min-h-dvh flex-col">
        <AppHeader />
        <main className="flex flex-1 items-center justify-center px-6 py-16">
          <div className="max-w-md text-center">
            <h1 className="font-serif text-4xl font-medium tracking-tight text-ink">
              Upload a résumé first
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              The profile is extracted from your résumé so matching stays grounded in work you
              have actually done.
            </p>
            <Link
              href="/home"
              className="mt-6 inline-block rounded-[10px] bg-forest px-4 py-3 text-sm font-semibold tracking-tight text-paper"
            >
              Upload résumé
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const stored = profile ?? heuristicStoredProfile(resume);

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-forest">
          Candidate profile
        </p>
        <h1 className="mt-2 font-serif text-4xl font-medium tracking-tight text-ink">
          {stored.name ?? "Your profile"}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Correct anything the parser or Gemini got wrong. Matching uses this profile, not the
          raw file, once you save.
        </p>
        <p className="mt-2 font-mono text-[11px] text-faint">
          Source: {stored.source}
          {stored.updatedAt ? ` · updated ${new Date(stored.updatedAt).toLocaleString()}` : ""}
        </p>

        <div className="mt-8 rounded-[14px] border border-line bg-card p-6">
          <ProfileForm profile={stored} geminiReady={isGeminiConfigured()} />
        </div>

        {stored.facts.length > 0 || stored.inferences.length > 0 ? (
          <section className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-[14px] border border-line bg-card p-6">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-forest">
                Facts
              </h2>
              <ul className="mt-3 space-y-2 text-[14px] leading-relaxed text-text">
                {stored.facts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-[14px] border border-line bg-card p-6">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-forest">
                Inferences
              </h2>
              <ul className="mt-3 space-y-2 text-[14px] leading-relaxed text-muted">
                {stored.inferences.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
