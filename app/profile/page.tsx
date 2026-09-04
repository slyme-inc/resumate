import { ProfileForm } from "@/app/profile/profile-form";
import { ProfileResumePanel } from "@/app/profile/profile-resume";
import { AppHeader } from "@/components/app-header";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { requireResume } from "@/lib/auth/session";
import { getUserResumeAndProfile } from "@/lib/db/profile";
import { getResumeFileMeta } from "@/lib/db/resume-file";
import { heuristicStoredProfile } from "@/lib/profile/hydrate";

export const maxDuration = 60;

export default async function ProfilePage() {
  const { userId, resume } = await requireResume();
  const [{ profile }, fileMeta] = await Promise.all([
    getUserResumeAndProfile(userId),
    getResumeFileMeta(userId),
  ]);

  const stored = profile ?? heuristicStoredProfile(resume);

  return (
    <div className="flex h-dvh flex-col">
      <AppHeader />
    <ProfileResumePanel
      fileName={fileMeta?.fileName ?? resume.fileName}
      fileVersion={fileMeta ? String(fileMeta.updatedAt.getTime()) : null}
      contentType={fileMeta?.contentType ?? null}
      intro={
        <>
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
        </>
      }
    >
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
    </ProfileResumePanel>
    </div>
  );
}
