import { FirstRunTour } from "@/app/home/first-run-tour";
import { ResumeWorkspace } from "@/app/home/resume-workspace";
import { AppHeader } from "@/components/app-header";
import { ProfileSummary } from "@/components/profile-summary";
import { requireUserId } from "@/lib/auth/session";
import { getUserResume } from "@/lib/db/resume";
import { deriveCandidateProfile } from "@/lib/profile/derive";

export default async function Home() {
  const userId = await requireUserId();
  const initialResume = await getUserResume(userId);
  const profile = initialResume ? deriveCandidateProfile(initialResume) : null;

  return (
    <div className="flex h-dvh flex-col">
      <AppHeader />
      {profile ? <ProfileSummary profile={profile} /> : null}
      <main className="flex min-h-0 flex-1">
        <ResumeWorkspace initialResume={initialResume} />
      </main>
      <FirstRunTour />
    </div>
  );
}
