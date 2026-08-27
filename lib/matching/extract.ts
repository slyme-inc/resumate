import {
  ALIAS_ENTRIES,
  MAX_ALIAS_WORDS,
  ROLE_PATTERNS,
  SENIORITY_PATTERNS,
  type RoleFamily,
  type SeniorityLevel,
  type Skill,
} from "./taxonomy";
import { htmlToText, normalizeForMatch, tokenize } from "./text";

const ALIAS_LOOKUP = new Map<string, Skill>();
for (const entry of ALIAS_ENTRIES) {
  const key = normalizeForMatch(entry.alias);
  if (key && !ALIAS_LOOKUP.has(key)) {
    ALIAS_LOOKUP.set(key, entry.skill);
  }
}

export type SkillCounts = Map<string, number>;

/**
 * Greedy longest-match scan so "react native" is not also counted as "react".
 * `structured` unlocks ambiguous one-letter skills, and should only be true for
 * curated input like job tags or a résumé skills section.
 */
export function extractSkills(text: string, structured = false): SkillCounts {
  const counts: SkillCounts = new Map();
  if (!text) {
    return counts;
  }

  const tokens = tokenize(text);
  let index = 0;

  while (index < tokens.length) {
    let matched = false;
    const maxSpan = Math.min(MAX_ALIAS_WORDS, tokens.length - index);

    for (let span = maxSpan; span >= 1; span -= 1) {
      const phrase = tokens.slice(index, index + span).join(" ");
      const skill = ALIAS_LOOKUP.get(phrase);
      if (!skill || (skill.ambiguous && !structured)) {
        continue;
      }
      counts.set(skill.id, (counts.get(skill.id) ?? 0) + 1);
      index += span;
      matched = true;
      break;
    }

    if (!matched) {
      index += 1;
    }
  }

  return counts;
}

export function mergeCounts(...sources: SkillCounts[]): SkillCounts {
  const merged: SkillCounts = new Map();
  for (const source of sources) {
    for (const [id, count] of source) {
      merged.set(id, (merged.get(id) ?? 0) + count);
    }
  }
  return merged;
}

export function detectRole(title: string, fallbackText = ""): RoleFamily {
  const haystack = normalizeForMatch(`${title} ${fallbackText}`);
  const titleOnly = normalizeForMatch(title);

  for (const source of [titleOnly, haystack]) {
    for (const { family, patterns } of ROLE_PATTERNS) {
      if (patterns.some((pattern) => pattern.test(source))) {
        return family;
      }
    }
  }

  return "other";
}

export function detectSeniority(title: string, description = ""): SeniorityLevel {
  const titleText = normalizeForMatch(title);
  for (const { level, patterns } of SENIORITY_PATTERNS) {
    if (patterns.some((pattern) => pattern.test(titleText))) {
      return level;
    }
  }

  const years = detectRequiredYears(description);
  if (years !== null) {
    if (years >= 10) return "principal";
    if (years >= 8) return "staff";
    if (years >= 5) return "senior";
    if (years >= 2) return "mid";
    return "junior";
  }

  return "mid";
}

const YEARS_PATTERN = /(\d{1,2})\s*\+?\s*(?:-|–|to)?\s*(\d{1,2})?\s*\+?\s*years?\b/g;

/** Lowest credible "N years of experience" figure stated in a description. */
export function detectRequiredYears(description: string): number | null {
  if (!description) {
    return null;
  }
  const text = normalizeForMatch(description);
  let best: number | null = null;
  let match: RegExpExecArray | null;
  YEARS_PATTERN.lastIndex = 0;

  while ((match = YEARS_PATTERN.exec(text)) !== null) {
    const value = Number.parseInt(match[1], 10);
    if (!Number.isFinite(value) || value < 0 || value > 20) {
      continue;
    }
    if (best === null || value < best) {
      best = value;
    }
  }

  return best;
}

export type WorkMode = "remote" | "hybrid" | "onsite";

const REMOTE_PATTERN =
  /\b(remote|worldwide|anywhere|distributed|home[\s-]?based|work from home|wfh|global)\b/;
const HYBRID_PATTERN = /\bhybrid\b/;

export function detectWorkMode(
  location: string | null,
  description: string | null,
  title = "",
): WorkMode {
  // Titles frequently carry "(Remote)" even when the location column holds a
  // country, so they are checked alongside the location field.
  const explicit = normalizeForMatch(`${title} ${location ?? ""}`);
  if (HYBRID_PATTERN.test(explicit)) {
    return "hybrid";
  }
  if (REMOTE_PATTERN.test(explicit)) {
    return "remote";
  }

  const locationText = normalizeForMatch(location ?? "");

  // Only trust the description when the location field says nothing useful.
  const head = normalizeForMatch(htmlToText(description ?? "").slice(0, 600));
  if (HYBRID_PATTERN.test(head)) {
    return "hybrid";
  }
  if (/\b(fully remote|remote[\s-]?first|100% remote|work from anywhere)\b/.test(head)) {
    return "remote";
  }

  return locationText ? "onsite" : "onsite";
}

/**
 * Résumé date ranges are the only reliable experience signal available without
 * an LLM, so span from the earliest work year to the latest (or today).
 */
export function estimateYearsOfExperience(text: string): number | null {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  const pattern = /\b(19[89]\d|20[0-4]\d)\b/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const year = Number.parseInt(match[1], 10);
    if (year >= 1990 && year <= currentYear) {
      years.push(year);
    }
  }

  if (years.length === 0) {
    return null;
  }

  const earliest = Math.min(...years);
  const mentionsPresent = /\b(present|current|now|ongoing)\b/i.test(text);
  const latest = mentionsPresent ? currentYear : Math.max(...years);
  const span = latest - earliest;

  if (span < 0 || span > 45) {
    return null;
  }
  return span;
}
