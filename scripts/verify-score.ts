/**
 * Checks the composed matcher against synthetic postings.
 * Run with: npx tsx scripts/verify-score.ts
 */
import { normalizeJob, type JobScoreRow } from "@/lib/matching/job";
import { extractRoleCard } from "@/lib/matching/role-card";
import { scoreJob } from "@/lib/matching/score";
import type { CandidateProfile, ProfileSkill } from "@/lib/profile/types";

function skill(id: string, label: string, category: ProfileSkill["category"], weight = 2): ProfileSkill {
  return { id, label, category, weight };
}

function candidate(): CandidateProfile {
  const skills = [
    skill("react", "React", "frontend", 3),
    skill("typescript", "TypeScript", "language", 3),
    skill("nodejs", "Node.js", "backend", 2),
    skill("postgresql", "PostgreSQL", "database", 2),
  ];
  return {
    name: "Test",
    headline: "Full Stack Engineer",
    location: "Bangalore, India",
    skills,
    primarySkills: skills.slice(0, 2),
    secondarySkills: skills.slice(2),
    skillIds: new Set(skills.map((item) => item.id)),
    roles: ["fullstack", "frontend"],
    seniority: "mid",
    yearsOfExperience: 3,
    titles: ["Full Stack Developer"],
  };
}

function row(id: string, position: string, description: string, extra: Partial<JobScoreRow> = {}): JobScoreRow {
  return {
    source: "test",
    id,
    slug: id,
    company: "Acme",
    companyLogo: null,
    logo: null,
    position,
    tags: [],
    description,
    location: "Remote",
    applyUrl: null,
    url: null,
    date: new Date(),
    salaryMin: null,
    salaryMax: null,
    ...extra,
  };
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const profile = candidate();

const fit = normalizeJob(
  row(
    "fit",
    "Senior Full Stack Engineer (Remote)",
    `Requirements
- React
- TypeScript
- Node.js

Nice to have
- GraphQL
- AWS`,
  ),
);

const mismatch = normalizeJob(
  row(
    "k8s",
    "Staff Infrastructure Engineer",
    `Requirements
- Kubernetes
- Go
- Terraform

Nice to have
- AWS
- Python`,
    { location: "New York, NY" },
  ),
);

const fitScore = scoreJob(profile, fit);
const missScore = scoreJob(profile, mismatch);

console.log("fit", fitScore.score, fitScore.summary);
console.log("must-haves", fit.roleCard.mustHave, "nice", fit.roleCard.niceToHave);
console.log("mismatch", missScore.score, missScore.summary);
console.log("mismatch must-haves", mismatch.roleCard.mustHave);

assert(fit.roleCard.mustHave.includes("react"), "React should be a required skill");
assert(fit.roleCard.niceToHave.includes("graphql"), "GraphQL should be preferred, not required");
assert(fitScore.score >= 70, `React/TS full stack role should score high, got ${fitScore.score}`);
assert(missScore.score <= 58, `Staff K8s/Go role should be capped, got ${missScore.score}`);
assert(
  missScore.missingSkills.some((gap) => gap.id === "kubernetes" && gap.severity === "significant"),
  "Missing Kubernetes should be a significant gap",
);

const parsed = extractRoleCard({
  title: "Backend Engineer",
  tags: ["Python"],
  description: "You will build the payments API in Python and own production incidents every week.",
});
assert(parsed.mustHave.includes("python") || parsed.niceToHave.includes("python") || parsed.stack.includes("python"), "Python from title/tags");

console.log("ok");
