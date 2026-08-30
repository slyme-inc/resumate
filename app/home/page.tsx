import { FirstRunTour } from "@/app/home/first-run-tour";
import { ResumeWorkspace } from "@/app/home/resume-workspace";
import { AppHeader } from "@/components/app-header";
import { ProfileSummary } from "@/components/profile-summary";
import { requireUserId } from "@/lib/auth/session";
import { getUserResume } from "@/lib/db/resume";
import { getResumeFileMeta } from "@/lib/db/resume-file";
import { loadCandidateProfile } from "@/lib/matching/feed";

export default async function Home() {
  const userId = await requireUserId();
  const [initialResume, pdfMeta, profile] = await Promise.all([
    getUserResume(userId),
    getResumeFileMeta(userId),
    loadCandidateProfile(userId),
  ]);

  return (
    <div className="flex h-dvh flex-col">
      <AppHeader />
      {profile ? <ProfileSummary profile={profile} /> : null}
      <main className="flex min-h-0 flex-1">
        <ResumeWorkspace
          initialResume={initialResume}
          initialPdfVersion={
            pdfMeta && pdfMeta.byteSize > 0 ? String(pdfMeta.updatedAt.getTime()) : null
          }
        />
      </main>
      <FirstRunTour />
    </div>
  );
}
