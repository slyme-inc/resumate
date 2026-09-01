import { OnboardingUpload } from "@/app/onboarding/onboarding-upload";
import { AppHeader } from "@/components/app-header";
import { requireUserId } from "@/lib/auth/session";
import { getUserResume } from "@/lib/db/resume";
import { redirect } from "next/navigation";

export const maxDuration = 60;

export default async function OnboardingPage() {
  const userId = await requireUserId();
  const resume = await getUserResume(userId);
  if (resume) {
    redirect("/jobs");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader nav={false} />
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <OnboardingUpload />
      </main>
    </div>
  );
}
