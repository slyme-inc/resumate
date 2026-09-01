import { AppHeader } from "@/components/app-header";
import { CompanyIntelSection } from "@/components/company-intel";
import { JobWorkspace } from "@/components/job-workspace";
import { ScoreBadge, ScoreBreakdown } from "@/components/match-score";
import { SaveButton } from "@/components/save-button";
import { CompanyIntelSkeleton } from "@/components/skeletons";
import { extractRoleCardWithGemini } from "@/lib/ai/role-card";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { requireResume } from "@/lib/auth/session";
import { getJob, listSavedKeys } from "@/lib/db/jobs";
import { getUserResumeAndProfile } from "@/lib/db/profile";
import { getResumeFileMeta } from "@/lib/db/resume-file";
import { getStoredRoleCard, saveRoleCard } from "@/lib/db/role-card";
import { formatSalary, freshness } from "@/lib/format";
import { jobKey, normalizeJob } from "@/lib/matching/job";
import { scoreJob } from "@/lib/matching/score";
import { ROLE_LABELS, SENIORITY_LABELS, skillLabel } from "@/lib/matching/taxonomy";
import { paragraphKind, stripListPrefix, toParagraphs } from "@/lib/matching/text";
import { deriveCandidateProfile } from "@/lib/profile/derive";
import { toCandidateProfile } from "@/lib/profile/hydrate";
import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { Suspense, type ReactNode } from "react";

export const maxDuration = 60;

const WORK_MODE_LABELS = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
} as const;

function DescriptionBody({ paragraphs }: { paragraphs: string[] }) {
  const nodes: ReactNode[] = [];

  for (let index = 0; index < paragraphs.length; ) {
    const paragraph = paragraphs[index];
    if (!paragraph) {
      break;
    }
    const kind = paragraphKind(paragraph);

    if (kind === "list") {
      const items: string[] = [];
      const start = index;
      while (index < paragraphs.length) {
        const item = paragraphs[index];
        if (!item || paragraphKind(item) !== "list") {
          break;
        }
        items.push(stripListPrefix(item));
        index += 1;
      }
      nodes.push(
        <ul
          key={start}
          className="list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-text"
        >
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{item}</li>
          ))}
        </ul>,
      );
      continue;
    }

    nodes.push(
      kind === "heading" ? (
        <p
          key={index}
          className="pt-1 text-[15px] font-semibold tracking-tight text-ink"
        >
          {paragraph}
        </p>
      ) : (
        <p key={index} className="text-[15px] leading-relaxed text-text">
          {paragraph}
        </p>
      ),
    );
    index += 1;
  }

  return nodes;
}

export default async function JobDetailPage(props: PageProps<"/jobs/[source]/[id]">) {
  const { userId } = await requireResume();
  const { source, id } = await props.params;
  const decodedSource = decodeURIComponent(source);
  const decodedId = decodeURIComponent(id);

  const [row, stored, savedKeys, storedCard, fileMeta] = await Promise.all([
    getJob(decodedSource, decodedId),
    getUserResumeAndProfile(userId),
    listSavedKeys(userId),
    getStoredRoleCard(decodedSource, decodedId),
    getResumeFileMeta(userId),
  ]);
  if (!row) {
    notFound();
  }
  if (!stored.resume) {
    redirect("/onboarding");
  }

  const profile = stored.profile
    ? toCandidateProfile(stored.profile, stored.resume)
    : deriveCandidateProfile(stored.resume);
  const resume = stored.resume;
  const job = normalizeJob({ ...row, roleCard: storedCard });
  const match = scoreJob(profile, job);

  if (isGeminiConfigured() && job.roleCard.source !== "gemini") {
    after(async () => {
      try {
        await saveRoleCard(
          job.source,
          job.id,
          await extractRoleCardWithGemini({
            title: job.position,
            tags: job.tags,
            description: job.description,
          }),
        );
      } catch (error) {
        console.error("Gemini role-card extract failed.", error);
      }
    });
  }
  const saved = savedKeys.has(jobKey(job.source, job.id));

  const posted = freshness(job.date);
  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const paragraphs = job.description ? toParagraphs(job.description).slice(0, 40) : [];
  const applyHref = job.applyUrl || job.url;

  const facts = [
    ["Work mode", WORK_MODE_LABELS[job.workMode]],
    ["Location", job.location || "Not stated"],
    ["Level", SENIORITY_LABELS[job.seniority]],
    ["Focus", ROLE_LABELS[job.role]],
    ["Experience asked", job.requiredYears !== null ? `${job.requiredYears}+ years` : "Not stated"],
    ["Salary", salary ?? "Not listed"],
    ["Source", job.source],
  ] as const;

  return (
    <div className="flex h-dvh flex-col">
      <AppHeader />
      <JobWorkspace
        source={job.source}
        id={job.id}
        company={job.company}
        resume={resume}
        fileSrc={
          fileMeta && fileMeta.byteSize > 0
            ? `/api/resume/file?v=${fileMeta.updatedAt.getTime()}`
            : null
        }
        contentType={fileMeta && fileMeta.byteSize > 0 ? fileMeta.contentType : null}
        focusSkills={[
          ...match.matchedSkills.map(skillLabel),
          ...profile.primarySkills.map((skill) => skill.label),
        ]}
        header={
          <>
            <header className="flex flex-wrap items-start gap-5">
          <ScoreBadge score={match.score} />
          <div className="min-w-60 flex-1">
            <h1 className="font-serif text-4xl font-medium leading-tight tracking-tight text-ink">
              {job.position}
            </h1>
            <p className="mt-2 text-[15px] font-semibold tracking-tight text-forest">
              {job.company}
            </p>
            {posted ? (
              <p className="mt-2 font-mono text-[11px] text-faint">
                {posted.label}
                {posted.stale ? " · this listing may already be closed" : ""}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <SaveButton
              source={job.source}
              id={job.id}
              matchScore={match.score}
              saved={saved}
              variant="full"
            />
            {applyHref ? (
              <a
                href={applyHref}
                target="_blank"
                rel="noreferrer"
                className="rounded-[10px] bg-forest px-4 py-3 text-sm font-semibold tracking-tight text-paper transition-colors duration-150 hover:bg-forest-bright"
              >
                Apply
              </a>
            ) : null}
          </div>
            </header>
          </>
        }
      >
        <div className="space-y-6">
          <section className="rounded-[14px] border border-line bg-card p-6">
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-forest">
              Score breakdown
            </h2>
            <div className="mt-4">
              <ScoreBreakdown dimensions={match.dimensions} />
            </div>
            <p className="mt-5 border-t border-line pt-4 text-[13px] leading-relaxed text-muted">
              Scores compare your confirmed profile to this posting&apos;s required
              vs preferred skills. They are a guide to where to spend attention,
              not a probability of getting hired.
            </p>
          </section>

          <Suspense fallback={<CompanyIntelSkeleton />}>
            <CompanyIntelSection company={row.company} ycSlug={row.ycSlug} />
          </Suspense>
          <div className="rounded-[14px] border border-line bg-card p-6">
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-forest">
              The role
            </h2>
            <dl className="mt-4 space-y-3">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-sm tracking-tight text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            {job.tags.length > 0 ? (
              <div className="mt-5 border-t border-line pt-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">Tags</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {job.tags.slice(0, 12).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-line-strong px-2.5 py-1 text-xs tracking-tight text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {job.url ? (
              <a
                href={job.url}
                target="_blank"
                rel="noreferrer"
                className="mt-5 block border-t border-line pt-4 text-sm font-semibold tracking-tight text-forest hover:underline"
              >
                View original posting
              </a>
            ) : null}
          </div>
        </div>

        {paragraphs.length > 0 ? (
          <section className="mt-6 rounded-[14px] border border-line bg-card p-6">
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-forest">
              Job description
            </h2>
            <div className="mt-4 space-y-3">
              <DescriptionBody paragraphs={paragraphs} />
            </div>
          </section>
        ) : null}
      </JobWorkspace>
    </div>
  );
}
