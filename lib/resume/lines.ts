import type { ResumeRewrite } from "@/lib/ai/types";
import type { ParsedResume, ResumeBlock } from "@/lib/resume/types";

export type LineRef =
  | { kind: "name" }
  | { kind: "headline" }
  | { kind: "section"; sectionIndex: number }
  | { kind: "paragraph"; sectionIndex: number; blockIndex: number }
  | { kind: "bullet"; sectionIndex: number; blockIndex: number; itemIndex: number }
  | { kind: "tags"; sectionIndex: number; blockIndex: number };

export type ResumeLine = {
  id: string;
  ref: LineRef;
  text: string;
  display: "title" | "heading" | "body" | "bullet" | "tags";
};

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

const SKILL_HEADING = /skill|technolog|stack|tool|competenc/i;

export function isSkillHeading(title: string) {
  return SKILL_HEADING.test(title);
}

function splitSkillParts(text: string) {
  return text
    .split(/\s*(?:,|;|\||•|·|\/)\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function flattenResume(resume: ParsedResume): ResumeLine[] {
  const lines: ResumeLine[] = [];

  if (resume.name) {
    lines.push({ id: "name", ref: { kind: "name" }, text: resume.name, display: "title" });
  }
  if (resume.headline) {
    lines.push({
      id: "headline",
      ref: { kind: "headline" },
      text: resume.headline,
      display: "body",
    });
  }

  resume.sections.forEach((section, sectionIndex) => {
    lines.push({
      id: `section-${sectionIndex}`,
      ref: { kind: "section", sectionIndex },
      text: section.title,
      display: "heading",
    });

    section.blocks.forEach((block, blockIndex) => {
      if (block.type === "paragraph") {
        lines.push({
          id: `p-${sectionIndex}-${blockIndex}`,
          ref: { kind: "paragraph", sectionIndex, blockIndex },
          text: block.text,
          display: "body",
        });
        return;
      }
      if (block.type === "list") {
        block.items.forEach((item, itemIndex) => {
          lines.push({
            id: `b-${sectionIndex}-${blockIndex}-${itemIndex}`,
            ref: { kind: "bullet", sectionIndex, blockIndex, itemIndex },
            text: item,
            display: "bullet",
          });
        });
        return;
      }
      lines.push({
        id: `t-${sectionIndex}-${blockIndex}`,
        ref: { kind: "tags", sectionIndex, blockIndex },
        text: block.items.join(" · "),
        display: "tags",
      });
    });
  });

  return lines;
}

function scoreMatch(needle: string, haystack: string) {
  const a = normalize(needle);
  const b = normalize(haystack);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (b.includes(a) || a.includes(b)) {
    return Math.min(a.length, b.length) / Math.max(a.length, b.length);
  }

  const aTokens = new Set(a.split(" ").filter((token) => token.length > 2));
  const bTokens = b.split(" ").filter((token) => token.length > 2);
  if (aTokens.size === 0 || bTokens.length === 0) return 0;
  const overlap = bTokens.filter((token) => aTokens.has(token)).length;
  return overlap / Math.max(aTokens.size, bTokens.length);
}

function skillLineIds(lines: ResumeLine[]) {
  const ids = new Set<string>();
  let inSkills = false;
  for (const line of lines) {
    if (line.display === "heading") {
      inSkills = isSkillHeading(line.text);
      continue;
    }
    if (inSkills && line.display !== "title") {
      ids.add(line.id);
    }
  }
  return ids;
}

export function attachSuggestions(lines: ResumeLine[], rewrites: ResumeRewrite[]) {
  const used = new Set<string>();
  const suggested = new Map<string, ResumeRewrite>();
  const skillIds = skillLineIds(lines);

  for (const rewrite of rewrites) {
    let best: ResumeLine | null = null;
    let bestScore = 0;
    for (const line of lines) {
      if (used.has(line.id) || line.display === "heading" || line.display === "title") {
        continue;
      }
      const score = scoreMatch(rewrite.current, line.text);
      const threshold = skillIds.has(line.id) ? 0.28 : 0.45;
      if (score >= threshold && score > bestScore) {
        best = line;
        bestScore = score;
      }
    }
    if (best) {
      used.add(best.id);
      suggested.set(best.id, rewrite);
    }
  }

  return suggested;
}

function mentionsFocus(text: string, focus: string[]) {
  const haystack = normalize(text);
  return focus.some((skill) => {
    const needle = normalize(skill);
    if (needle.length < 2) return false;
    if (haystack === needle || haystack.includes(needle)) return true;
    return needle.length >= 4 && haystack.length >= 3 && needle.includes(haystack);
  });
}

export function skillReorderSuggestions(
  lines: ResumeLine[],
  focusSkills: string[],
): Map<string, ResumeRewrite> {
  const out = new Map<string, ResumeRewrite>();
  if (focusSkills.length === 0) {
    return out;
  }

  let inSkills = false;
  for (const line of lines) {
    if (line.display === "heading") {
      inSkills = isSkillHeading(line.text);
      continue;
    }
    if (!inSkills || line.display === "title") {
      continue;
    }

    const labeled = line.text.match(/^([^:]{1,48}):\s*(.+)$/);
    const prefix = labeled ? `${labeled[1].trim()}: ` : "";
    const items = splitSkillParts(labeled?.[2] ?? line.text);
    if (items.length < 2) {
      continue;
    }

    const ranked = [...items].sort((a, b) => {
      return Number(mentionsFocus(b, focusSkills)) - Number(mentionsFocus(a, focusSkills));
    });
    const suggested = `${prefix}${ranked.join(", ")}`;
    if (normalize(suggested) === normalize(line.text)) {
      continue;
    }
    if (!ranked.some((item) => mentionsFocus(item, focusSkills))) {
      continue;
    }

    out.set(line.id, {
      current: line.text,
      suggested,
      reason: "Lead this skills line with technologies the posting names.",
    });
  }

  return out;
}

export function mergeSuggestions(
  primary: Map<string, ResumeRewrite>,
  fallback: Map<string, ResumeRewrite>,
) {
  const merged = new Map(primary);
  for (const [id, rewrite] of fallback) {
    if (!merged.has(id)) {
      merged.set(id, rewrite);
    }
  }
  return merged;
}

export function unmatchedRewrites(
  rewrites: ResumeRewrite[],
  suggested: Map<string, ResumeRewrite>,
) {
  const used = new Set([...suggested.values()]);
  return rewrites.filter((rewrite) => !used.has(rewrite));
}

function replaceBlock(
  blocks: ResumeBlock[],
  blockIndex: number,
  next: ResumeBlock,
): ResumeBlock[] {
  return blocks.map((block, index) => (index === blockIndex ? next : block));
}

export function applyAcceptedEdits(
  resume: ParsedResume,
  lines: ResumeLine[],
  suggested: Map<string, ResumeRewrite>,
  status: Record<string, "accepted" | "rejected" | "pending">,
): ParsedResume {
  const next: ParsedResume = {
    ...resume,
    links: [...resume.links],
    sections: resume.sections.map((section) => ({
      ...section,
      blocks: section.blocks.map((block) =>
        block.type === "list" || block.type === "tags"
          ? { ...block, items: [...block.items] }
          : { ...block },
      ),
    })),
  };

  for (const line of lines) {
    if (status[line.id] !== "accepted") continue;
    const rewrite = suggested.get(line.id);
    if (!rewrite?.suggested.trim()) continue;
    const text = rewrite.suggested.trim();

    switch (line.ref.kind) {
      case "name":
        next.name = text;
        break;
      case "headline":
        next.headline = text;
        break;
      case "section":
        next.sections[line.ref.sectionIndex] = {
          ...next.sections[line.ref.sectionIndex],
          title: text,
        };
        break;
      case "paragraph":
        next.sections[line.ref.sectionIndex].blocks = replaceBlock(
          next.sections[line.ref.sectionIndex].blocks,
          line.ref.blockIndex,
          { type: "paragraph", text },
        );
        break;
      case "bullet": {
        const block = next.sections[line.ref.sectionIndex].blocks[line.ref.blockIndex];
        if (block.type === "list") {
          block.items[line.ref.itemIndex] = text;
        }
        break;
      }
      case "tags": {
        const block = next.sections[line.ref.sectionIndex].blocks[line.ref.blockIndex];
        if (block.type === "tags") {
          block.items = text.split(/\s*[·,|]\s*/).filter(Boolean);
        }
        break;
      }
    }
  }

  return next;
}
