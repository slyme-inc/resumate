import { signOutAction } from "@/app/actions/auth";
import { FirstRunTour } from "@/app/home/first-run-tour";
import { ResumeWorkspace } from "@/app/home/resume-workspace";
import { getUserResume } from "@/lib/db/resume";
import { createClient } from "@/lib/supabase/server";
import logo from "@/public/logo.png";
import Image from "next/image";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;

  if (!userId) {
    redirect("/login");
  }

  const initialResume = await getUserResume(userId);

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-line px-6 py-4">
        <Image
          src={logo}
          alt="Resumate"
          priority
          className="h-7 w-auto"
        />
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-[10px] border border-line-strong px-4 py-2.5 text-sm font-semibold tracking-tight text-ink"
          >
            Log out
          </button>
        </form>
      </header>
      <main className="flex min-h-0 flex-1">
        <ResumeWorkspace initialResume={initialResume} />
      </main>
      <FirstRunTour />
    </div>
  );
}
