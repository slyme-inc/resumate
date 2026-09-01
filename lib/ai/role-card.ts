import { generateJson } from "@/lib/ai/gemini";
import { extractSkills } from "@/lib/matching/extract";
import type { RoleCard } from "@/lib/matching/role-card";
import { ROLE_LABELS } from "@/lib/matching/taxonomy";

function clip(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}\n…[truncated]` : text;
}

function toIds(labels: string[] | undefined) {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const label of labels ?? []) {
    const extracted = extractSkills(label, true);
    const next = extracted.size > 0 ? [...extracted.keys()] : label.trim() ? [`other:${label.trim().toLowerCase()}`] : [];
    for (const id of next) {
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

type GeminiRoleCard = {
  mustHave: string[];
  niceToHave: string[];
  duties: string[];
  disqualifiers: string[];
  role?: string;
};

const ROLE_IDS = new Set(Object.keys(ROLE_LABELS));

export async function extractRoleCardWithGemini(input: {
  title: string;
  tags: string[];
  description: string;
}): Promise<RoleCard> {
  const draft = await generateJson<GeminiRoleCard>(
    `Extract hiring requirements from a job posting. Return JSON only.

Rules:
- mustHave: technologies/skills that are clearly required. One item per skill. Empty if unclear.
- niceToHave: preferred, bonus, or mentioned in responsibilities but not required.
- Never invent skills that are not in the posting.
- duties: up to 6 short responsibility lines copied or tightly paraphrased.
- disqualifiers: visa/clearance/PhD/on-site-only constraints. Empty array if none.
- role: one of ${[...ROLE_IDS].join(", ")} or omit.

JSON shape:
{ "mustHave": string[], "niceToHave": string[], "duties": string[], "disqualifiers": string[], "role": string }

Title: ${input.title}
Tags: ${input.tags.join(", ")}

Description:
${clip(input.description, 2200)}
`,
    { deadlineMs: 12_000 },
  );

  const mustHave = toIds(draft.mustHave).slice(0, 10);
  const niceToHave = toIds(draft.niceToHave).filter((id) => !mustHave.includes(id)).slice(0, 12);

  return {
    version: 1,
    source: "gemini",
    mustHave,
    niceToHave,
    stack: [...mustHave, ...niceToHave].slice(0, 16),
    duties: (draft.duties ?? []).map((line) => line.trim()).filter(Boolean).slice(0, 6),
    disqualifiers: (draft.disqualifiers ?? []).map((line) => line.trim()).filter(Boolean).slice(0, 4),
  };
}
