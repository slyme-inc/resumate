import { extractSkills, mergeCounts, type SkillCounts } from "@/lib/matching/extract";
import { skillLabel } from "@/lib/matching/taxonomy";

export type RoleCardSource = "heuristic" | "gemini";

export type RoleCard = {
  version: 1;
  source: RoleCardSource;
  mustHave: string[];
  niceToHave: string[];
  stack: string[];
  duties: string[];
  disqualifiers: string[];
};

const MUST_HEADING =
  /\b(requirements?|qualifications?|what you('?ll| will) need|you have|must[- ]haves?|minimum qual|required skills?|basic qual|what we'?re looking|who you are|we ask that|you should have)\b/i;
const NICE_HEADING =
  /\b(nice[- ]to[- ]have|preferred qual|bonus|plus\b|optional|good to have|desired|a plus)\b/i;
const DUTY_HEADING =
  /\b(responsibilit|what you('?ll| will) do|what you will do|the role|about the (role|job)|day[- ]to[- ]day|you will)\b/i;
const DISQUALIFIER =
  /\b(security clearance|us citizen|citizenship required|no visa|visa sponsor|must be located|phd required|doctorate required)\b/i;

type SectionKind = "must" | "nice" | "duty" | "other";

function classifyHeading(line: string): SectionKind | null {
  const trimmed = line.replace(/^#{1,3}\s+/, "").replace(/[:*]+$/, "").trim();
  if (!trimmed || trimmed.length > 56 || trimmed.split(/\s+/).length > 5) {
    return null;
  }
  if (NICE_HEADING.test(trimmed)) {
    return "nice";
  }
  if (MUST_HEADING.test(trimmed)) {
    return "must";
  }
  if (DUTY_HEADING.test(trimmed)) {
    return "duty";
  }
  return null;
}

function idsFrom(counts: SkillCounts) {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}

function uniqueIds(...groups: string[][]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const group of groups) {
    for (const id of group) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/**
 * Split a posting into must-have vs nice-to-have using section headings.
 * Title and tags always count as requirements; body skills without a
 * Requirements heading fall through as preferred.
 */
export function extractRoleCard(input: {
  title: string;
  tags: string[];
  description: string;
}): RoleCard {
  const { title, tags, description } = input;
  const fromTitle = extractSkills(title, true);
  const fromTags = extractSkills(tags.join(" \n "), true);

  const lines = description.split("\n").map((line) => line.trim());
  const buckets: Record<SectionKind, string[]> = {
    must: [],
    nice: [],
    duty: [],
    other: [],
  };
  let current: SectionKind = "other";
  const duties: string[] = [];
  const disqualifiers: string[] = [];

  for (const line of lines) {
    if (!line) continue;
    const heading = classifyHeading(line);
    if (heading) {
      current = heading;
      continue;
    }
    buckets[current].push(line);
    if (current === "duty" && duties.length < 6) {
      const bullet = line.replace(/^[-*•]\s*/, "");
      if (bullet.length >= 20 && bullet.length <= 180) {
        duties.push(bullet);
      }
    }
    if (DISQUALIFIER.test(line) && disqualifiers.length < 4) {
      disqualifiers.push(line.slice(0, 140));
    }
  }

  const mustBody = extractSkills(buckets.must.join("\n"), true);
  const niceBody = extractSkills(buckets.nice.join("\n"), true);
  const otherBody = extractSkills(buckets.other.join("\n"), false);
  const dutyBody = extractSkills(buckets.duty.join("\n"), false);

  const required = uniqueIds(idsFrom(mergeCounts(fromTitle, fromTags)), idsFrom(mustBody));
  const preferred = uniqueIds(idsFrom(niceBody), idsFrom(dutyBody), idsFrom(otherBody)).filter(
    (id) => !required.includes(id),
  );

  // No Requirements heading: title/tags are the bar, everything else is preferred.
  const mustHave = required.length > 0 ? required.slice(0, 10) : uniqueIds(idsFrom(mergeCounts(fromTitle, fromTags))).slice(0, 8);
  const niceToHave =
    preferred.length > 0
      ? preferred.slice(0, 12)
      : idsFrom(otherBody).filter((id) => !mustHave.includes(id)).slice(0, 12);

  return {
    version: 1,
    source: "heuristic",
    mustHave,
    niceToHave,
    stack: uniqueIds(mustHave, niceToHave).slice(0, 16),
    duties: duties.slice(0, 6),
    disqualifiers,
  };
}

export function isRoleCard(value: unknown): value is RoleCard {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Partial<RoleCard>;
  return (
    record.version === 1 &&
    Array.isArray(record.mustHave) &&
    Array.isArray(record.niceToHave) &&
    (record.source === "heuristic" || record.source === "gemini")
  );
}

export function roleCardSummary(card: RoleCard) {
  return {
    mustHave: card.mustHave.map(skillLabel),
    niceToHave: card.niceToHave.map(skillLabel),
    duties: card.duties,
    disqualifiers: card.disqualifiers,
  };
}
