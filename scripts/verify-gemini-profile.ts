import { config } from "dotenv";
import { extractProfileWithGemini } from "@/lib/ai/profile";
import type { ParsedResume } from "@/lib/resume/types";

config({ path: ".env.local", override: true });

const resume: ParsedResume = {
  fileName: "sample.pdf",
  rawText: `
Jane Chen
San Francisco, CA
jane@example.com
github.com/janechen

Full Stack Engineer

TECHNICAL SKILLS
React, TypeScript, Next.js, Node.js, PostgreSQL, Prisma

WORK EXPERIENCE
Full Stack Developer, Northwind Labs — 2023–2026
Built a React Native and Next.js product used by 12,000 monthly users.
Owned the Node.js API and PostgreSQL schema.

PROJECTS
Atlas — habit tracker in React Native and Node.js

EDUCATION
B.S. Computer Science
`,
  name: "Jane Chen",
  headline: "Full Stack Engineer",
  email: "jane@example.com",
  phone: null,
  location: "San Francisco, CA",
  links: [{ label: "GitHub", url: "https://github.com/janechen" }],
  sections: [
    {
      title: "TECHNICAL SKILLS",
      blocks: [{ type: "tags", items: ["React", "TypeScript", "Next.js", "Node.js", "PostgreSQL"] }],
    },
    {
      title: "WORK EXPERIENCE",
      blocks: [
        {
          type: "paragraph",
          text: "Full Stack Developer, Northwind Labs — 2023–2026",
        },
        {
          type: "list",
          items: [
            "Built a React Native and Next.js product used by 12,000 monthly users.",
            "Owned the Node.js API and PostgreSQL schema.",
          ],
        },
      ],
    },
  ],
};

extractProfileWithGemini(resume)
  .then((profile) => {
    console.log(JSON.stringify(profile, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
