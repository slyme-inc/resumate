import { getUserId } from "@/lib/auth/session";
import { countJobs } from "@/lib/db/jobs";
import logo from "@/public/logo.png";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

const STEPS = [
  {
    title: "Upload once",
    body: "A PDF or DOCX. We read the skills, roles, and dates so nothing is invented on your behalf.",
  },
  {
    title: "See the fit",
    body: "Every open role is scored against that profile across skills, seniority, and location.",
  },
  {
    title: "Know the gap",
    body: "Each match says plainly what already lands and what the posting asks for that you have not shown.",
  },
];

export default async function LandingPage() {
  if (await getUserId()) {
    redirect("/jobs");
  }

  let jobCount = 0;
  try {
    jobCount = await countJobs();
  } catch {
    // The landing page should still render if the database is unreachable.
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <Image src={logo} alt="Resumate" priority className="h-7 w-auto" />
        <Link
          href="/login"
          className="rounded-[10px] border border-line-strong px-4 py-2.5 text-sm font-semibold tracking-tight text-ink transition-colors duration-150 hover:bg-card"
        >
          Sign in
        </Link>
      </header>

      <main className="flex-1">
        <section className="auth-canvas !min-h-0 px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-forest">
              Résumé-led job matching
            </p>
            <h1 className="mt-4 font-serif text-6xl font-medium leading-[1.05] tracking-tight text-ink">
              Find the roles you should actually pursue.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-muted">
              Upload your résumé once. Every role is ranked against the work you have actually
              done, with the reasoning shown rather than hidden behind a number.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/login"
                className="rounded-[10px] bg-forest px-5 py-3.5 text-sm font-semibold tracking-tight text-paper transition-colors duration-150 hover:bg-forest-bright"
              >
                Upload your résumé
              </Link>
              <Link
                href="/login"
                className="rounded-[10px] border border-line-strong bg-card px-5 py-3.5 text-sm font-semibold tracking-tight text-ink transition-colors duration-150 hover:bg-paper"
              >
                Sign in
              </Link>
            </div>
            {jobCount > 0 ? (
              <p className="mt-6 font-mono text-[11px] text-faint">
                {jobCount.toLocaleString()} roles indexed from public job boards
              </p>
            ) : null}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 pb-24">
          <div className="grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <article key={step.title} className="rounded-[14px] border border-line bg-card p-6">
                <p className="font-mono text-[11px] font-medium tracking-[0.16em] text-faint">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h2 className="mt-3 font-serif text-2xl font-medium tracking-tight text-ink">
                  {step.title}
                </h2>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{step.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line px-6 py-6">
        <p className="mx-auto max-w-4xl font-mono text-[11px] text-faint">
          Resumate · Matches are generated from public job listings and your own résumé.
        </p>
      </footer>
    </div>
  );
}
