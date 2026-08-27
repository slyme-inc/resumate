/**
 * Smoke-checks the matching pipeline against real rows.
 * Run with: npx tsx scripts/verify-matching.ts
 */
import { config } from "dotenv";
import { fetchJobPool } from "@/lib/db/jobs";
import { normalizeJob } from "@/lib/matching/job";
import { scoreJob } from "@/lib/matching/score";
import { skillLabel } from "@/lib/matching/taxonomy";
import { htmlToText } from "@/lib/matching/text";
import { deriveCandidateProfile } from "@/lib/profile/derive";
import type { ParsedResume } from "@/lib/resume/types";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const resume: ParsedResume = {
  fileName: "sample.pdf",
  rawText: "",
  name: "Test Candidate",
  headline: "Full Stack Developer",
  email: "test@example.com",
  phone: null,
  location: "Bangalore, India",
  links: [],
  sections: [
    {
      title: "Skills",
      blocks: [
        {
          type: "tags",
          items: [
            "React",
            "React Native",
            "TypeScript",
            "Node.js",
            "PostgreSQL",
            "Next.js",
            "Prisma",
            "Go",
          ],
        },
      ],
    },
    {
      title: "Experience",
      blocks: [
        { type: "paragraph", text: "Full Stack Developer, Acme (2022 - Present)" },
        {
          type: "list",
          items: [
            "Built React and TypeScript dashboards backed by Node.js APIs.",
            "Designed PostgreSQL schemas and shipped a React Native companion app.",
          ],
        },
      ],
    },
  ],
};

async function main() {
  const profile = deriveCandidateProfile(resume);

  console.log("=== CANDIDATE PROFILE ===");
  console.log("seniority:", profile.seniority);
  console.log("years:", profile.yearsOfExperience);
  console.log("roles:", profile.roles.join(", "));
  console.log("primary:", profile.primarySkills.map((s) => `${s.label}(${s.weight})`).join(", "));
  console.log("secondary:", profile.secondarySkills.map((s) => s.label).join(", "));

  const pool = await fetchJobPool({
    skillTerms: profile.primarySkills.map((s) => s.label),
    limit: 300,
  });

  console.log(`\n=== POOL: ${pool.length} rows ===`);

  const scored = pool
    .map((row) => {
      const normalized = normalizeJob(row);
      return { normalized, match: scoreJob(profile, normalized) };
    })
    .sort((a, b) => b.match.score - a.match.score);

  console.log("\n=== TOP 8 ===");
  for (const { normalized, match } of scored.slice(0, 8)) {
    console.log(
      `\n${match.score}%  ${normalized.position} @ ${normalized.company}` +
        `\n      role=${normalized.role} seniority=${normalized.seniority} mode=${normalized.workMode} reqYears=${normalized.requiredYears}` +
        `\n      matched: ${match.matchedSkills.slice(0, 6).map(skillLabel).join(", ") || "-"}` +
        `\n      gaps: ${match.missingSkills.slice(0, 4).map((g) => `${g.label}(${g.severity})`).join(", ") || "-"}` +
        `\n      "${match.summary}"`,
    );
  }

  console.log("\n=== BOTTOM 3 (sanity) ===");
  for (const { normalized, match } of scored.slice(-3)) {
    console.log(
      `${match.score}%  ${normalized.position} @ ${normalized.company} (role=${normalized.role})`,
    );
  }

  const withSkills = scored.filter((s) => s.normalized.skills.length > 0).length;
  console.log(`\nskill detection: ${withSkills}/${scored.length} rows had >=1 skill`);
  console.log("score range:", scored[scored.length - 1]?.match.score, "-", scored[0]?.match.score);

  const htmlRow = pool.find((row) => row.description?.includes("<"));
  if (htmlRow) {
    console.log("\n=== HTML STRIP SAMPLE ===");
    console.log(htmlToText(htmlRow.description ?? "").slice(0, 200));
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
