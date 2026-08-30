import { generateJson } from "@/lib/ai/gemini";
import type { OpportunityInsight } from "@/lib/ai/types";
import type { NormalizedJob } from "@/lib/matching/job";
import type { MatchResult } from "@/lib/matching/score";
import { skillLabel } from "@/lib/matching/taxonomy";
import type { CandidateProfile } from "@/lib/profile/types";
import type { StoredProfile } from "@/lib/profile/stored";
import { flattenResume } from "@/lib/resume/lines";
import type { ParsedResume } from "@/lib/resume/types";

function clip(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}\n…[truncated]` : text;
}

export async function generateOpportunityInsight(input: {
  resume: ParsedResume;
  stored: StoredProfile;
  profile: CandidateProfile;
  job: NormalizedJob;
  match: MatchResult;
}): Promise<OpportunityInsight> {
  const { resume, stored, profile, job, match } = input;

  const insight = await generateJson<OpportunityInsight>(
    `You advise one candidate on one job. Return JSON only.

Hard rules:
- Never invent skills, employers, achievements, funding, team size, or contacts.
- Resume recommendations must rewrite information already in the résumé. Do not add skills the résumé does not show.
- resumeFit.improve[].current MUST be an exact quote of a résumé bullet, sentence, or skills line (copy it verbatim) so we can highlight that line. suggested is a tighter rewrite of that same line only.
- Always include at least one improve item for a Skills / Technical Skills line when those lines exist. Reorder or tighten skills already written there. Never add a skill that is not already on the résumé.
- If a job asks for a skill the candidate has not demonstrated, put it in gaps or resumeFit.missing — never recommend claiming it.
- companyFromPosting may only summarize what the job description itself says about the company. Null if the posting does not describe the company.
- approach.steps: practical, non-spammy. You do not have founder emails. Do not invent names.
- Gaps already scored: ${match.missingSkills.map((gap) => `${gap.label} (${gap.severity})`).join(", ") || "none"}.
- Matched skills: ${match.matchedSkills.map(skillLabel).join(", ") || "none"}.

JSON shape:
{
  "version": 1,
  "whyFit": string,
  "strengths": string[],
  "gaps": [{"label": string, "severity": "minor" | "moderate" | "significant", "note": string}],
  "resumeFit": {
    "keep": string[],
    "emphasize": string[],
    "improve": [{"current": "exact quote from the résumé", "suggested": "rewritten line", "reason": string}],
    "deEmphasize": string[],
    "missing": string[]
  },
  "approach": {"steps": string[], "note": string},
  "companyFromPosting": string | null
}

Candidate (facts vs inference):
Name: ${stored.name ?? profile.name ?? "unknown"}
Headline: ${stored.headline ?? profile.headline ?? ""}
Location: ${stored.location ?? profile.location ?? ""}
Seniority: ${stored.seniority}
Years: ${stored.yearsOfExperience ?? "unknown"}
Roles: ${stored.roles.join(", ")}
Primary skills: ${stored.skills.filter((s) => s.prominence === "primary").map((s) => s.label).join(", ")}
Secondary skills: ${stored.skills.filter((s) => s.prominence === "secondary").map((s) => s.label).join(", ")}
Strengths: ${stored.strengths.join("; ")}
Facts: ${stored.facts.join("; ")}
Inferences: ${stored.inferences.join("; ")}

Résumé lines (copy current from these verbatim):
${flattenResume(resume)
  .filter((line) => line.display === "body" || line.display === "bullet" || line.display === "tags")
  .map((line) => `- ${line.text}`)
  .join("\n")
  .slice(0, 8000)}

Résumé text:
${clip(resume.rawText, 6000)}

Job:
Company: ${job.company}
Title: ${job.position}
Location: ${job.location ?? "not stated"}
Work mode: ${job.workMode}
Apply URL: ${job.applyUrl ?? job.url ?? "not stated"}
Heuristic match score: ${match.score}%
Heuristic summary: ${match.summary}

Job description:
${clip(job.description, 9000)}
`,
  );

  return {
    version: 1,
    whyFit: insight.whyFit,
    strengths: insight.strengths ?? [],
    gaps: insight.gaps ?? [],
    resumeFit: {
      keep: insight.resumeFit?.keep ?? [],
      emphasize: insight.resumeFit?.emphasize ?? [],
      improve: insight.resumeFit?.improve ?? [],
      deEmphasize: insight.resumeFit?.deEmphasize ?? [],
      missing: insight.resumeFit?.missing ?? [],
    },
    approach: {
      steps: insight.approach?.steps ?? [],
      note: insight.approach?.note ?? "",
    },
    companyFromPosting: insight.companyFromPosting ?? null,
  };
}
