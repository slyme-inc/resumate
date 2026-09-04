import { AppHeader } from "@/components/app-header";
import { ScoreBadge } from "@/components/match-score";
import { OssContributeGuideCard } from "@/components/oss-contribute";
import { ReadmeMarkdown } from "@/components/readme-markdown";
import { requireUserId } from "@/lib/auth/session";
import { loadCandidateProfile } from "@/lib/matching/feed";
import { formatStars, pushedLabel, repoTitle, ycCompanyUrl } from "@/lib/oss/display";
import { loadOssRepoDetail } from "@/lib/oss/feed";
import { githubRepoUrl, type GithubReadme } from "@/lib/oss/readme";
import { notFound, redirect } from "next/navigation";

export const maxDuration = 60;

function ReadmePanel({ readme }: { readme: GithubReadme | null }) {
  return (
    <aside className="flex min-h-[55vh] min-w-0 flex-1 flex-col border-t border-line bg-card lg:min-h-0 lg:w-1/2 lg:border-t-0 lg:border-l">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-forest">
          {readme?.name ?? "README.md"}
        </p>
        {readme ? (
          <a
            href={`${readme.htmlUrl}#readme`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold tracking-tight text-forest hover:underline"
          >
            GitHub
          </a>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
        {readme ? (
          <ReadmeMarkdown
            markdown={readme.markdown}
            assetBase={readme.assetBase}
            blobBase={readme.blobBase}
          />
        ) : (
          <p className="text-[15px] leading-relaxed text-muted">
            This repository did not expose a public README we could load. Open GitHub for the source.
          </p>
        )}
      </div>
    </aside>
  );
}

export default async function OssRepoPage(props: PageProps<"/open-source/[id]">) {
  const userId = await requireUserId();
  const { id } = await props.params;
  const decoded = decodeURIComponent(id);
  const profile = await loadCandidateProfile(userId);
  if (!profile) {
    redirect("/onboarding");
  }

  const detail = await loadOssRepoDetail(userId, profile, decoded);
  if (!detail) {
    notFound();
  }

  const { repo, match, readme, guide } = detail;
  const github = repo.repoUrl || githubRepoUrl(repo.fullName);
  const stars = formatStars(repo.stars);
  const pushed = pushedLabel(repo.pushedAt);
  const facts = [
    ["Company", repo.company],
    ["Language", repo.language ?? "Not stated"],
    ["Stars", stars ?? "Not listed"],
    ["Last push", pushed ?? "Not listed"],
    ["Industry", repo.industry ?? "Not stated"],
    ["YC batch", repo.ycBatch ?? "—"],
  ] as const;

  return (
    <div className="flex h-dvh flex-col">
      <AppHeader />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8 lg:w-1/2">
          <header className="flex flex-wrap items-start gap-5">
            <ScoreBadge score={match.score} />
            <div className="min-w-60 flex-1">
              <h1 className="font-serif text-4xl font-medium leading-tight tracking-tight text-ink">
                {repoTitle(repo.fullName)}
              </h1>
              <p className="mt-2 text-[15px] font-semibold tracking-tight text-forest">
                {repo.fullName}
              </p>
              {repo.description ? (
                <p className="mt-3 text-[15px] leading-relaxed text-muted">{repo.description}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {repo.ycSlug ? (
                <a
                  href={ycCompanyUrl(repo.ycSlug)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[10px] border border-line-strong px-4 py-3 text-sm font-semibold tracking-tight text-ink transition-colors duration-150 hover:bg-card"
                >
                  YC profile
                </a>
              ) : null}
              {github ? (
                <a
                  href={github}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[10px] bg-forest px-4 py-3 text-sm font-semibold tracking-tight text-paper transition-colors duration-150 hover:bg-forest-bright"
                >
                  Open repo
                </a>
              ) : null}
            </div>
          </header>

          <div className="mt-8">
            <OssContributeGuideCard guide={guide} matchedSkills={match.matchedSkills} />
          </div>

          <section className="mt-6 rounded-[14px] border border-line bg-card p-6">
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-forest">
              The repository
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
          </section>
        </div>
        <ReadmePanel readme={readme} />
      </div>
    </div>
  );
}
