import { extractSkills } from "./extract";
import { skillLabel } from "./taxonomy";
import { htmlToText } from "./text";

export const CUSTOM_JOB_SOURCE = "custom";

export const CUSTOM_JOB_MIN_CHARS = 80;
export const CUSTOM_JOB_MAX_CHARS = 40_000;

const FIELD_LABEL =
  /^(job\s+title|title|position|role|company(?:\s+name)?|location|where|apply(?:\s+(?:at|url|link))?|url|link)\s*[:：]\s*(.+)$/i;
const TITLE_AT_COMPANY = /^(.{3,80}?)\s+(?:at|@)\s+(.{2,60})$/i;
const COMPANY_HIRING = /^(.{2,60}?)\s+is\s+hiring\s+(?:an?\s+|our\s+)?(.{3,80})$/i;
const SECTION_LINE =
  /^(about(?:\s+us|\s+the\s+(?:role|job|company))?|overview|description|the role|what you(?:'ll| will) do|what we(?:'re| are) looking for|who you are|responsibilities|requirements|qualifications|benefits|perks|nice to have|must have|preferred qualifications)\b/i;
const LIST_PREFIX = /^(?:[-*•●◦·–—▪▸►]\s+|\d+[.)]\s+)/u;

export type CustomJobDraft = {
  position: string;
  company: string | null;
  location: string | null;
  url: string | null;
  description: string;
  tags: string[];
};

export function isCustomJobSource(source: string) {
  return source === CUSTOM_JOB_SOURCE;
}

export function ownsCustomJob(userId: string, id: string) {
  return id.startsWith(`${userId}:`);
}

export function parseHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function looksLikeTitle(line: string) {
  if (line.length < 3 || line.length > 90) {
    return false;
  }
  if (SECTION_LINE.test(line) || LIST_PREFIX.test(line)) {
    return false;
  }
  if (/[.!?]/.test(line) && line.length > 48) {
    return false;
  }
  return true;
}

function looksLikeCompany(line: string) {
  if (line.length < 2 || line.length > 80) {
    return false;
  }
  if (SECTION_LINE.test(line) || LIST_PREFIX.test(line) || /[.!?]$/.test(line)) {
    return false;
  }
  if (
    /^(remote|hybrid|on-?site|full[- ]time|part[- ]time|contract|permanent|temporary)\b/i.test(
      line,
    )
  ) {
    return false;
  }
  return true;
}

function stripTitleMeta(line: string) {
  return line.split(/\s+[·•|]\s+/)[0]?.trim() ?? line;
}

function tagsFrom(description: string, position: string) {
  const counts = extractSkills(`${position}\n${description}`, false);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => skillLabel(id));
}

/**
 * Pull a title, company, and location out of a pasted posting when the user
 * did not fill those fields. Labeled lines win; otherwise the first short
 * heading-like line is treated as the role title.
 */
export function parsePastedJob(input: {
  description: string;
  position?: string;
  company?: string;
  location?: string;
  url?: string;
}): CustomJobDraft {
  const description = htmlToText(input.description).trim();
  const lines = description
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let position = input.position?.trim() ?? "";
  let company = input.company?.trim() ?? "";
  let location = input.location?.trim() ?? "";
  const url = input.url?.trim() ? parseHttpUrl(input.url) : null;

  for (const line of lines.slice(0, 24)) {
    const labeled = line.match(FIELD_LABEL);
    if (labeled) {
      const key = labeled[1]?.toLowerCase() ?? "";
      const value = labeled[2]?.trim() ?? "";
      if (!value) {
        continue;
      }
      if (!position && /title|position|role/.test(key)) {
        position = stripTitleMeta(value);
      } else if (!company && key.startsWith("company")) {
        company = value;
      } else if (!location && /location|where/.test(key)) {
        location = value;
      }
      continue;
    }

    if (!position && !company) {
      const hiring = line.match(COMPANY_HIRING);
      if (hiring?.[1] && hiring[2]) {
        company = hiring[1].trim();
        position = stripTitleMeta(hiring[2]);
        continue;
      }
      const atCompany = line.match(TITLE_AT_COMPANY);
      if (atCompany?.[1] && atCompany[2] && looksLikeTitle(atCompany[1])) {
        position = stripTitleMeta(atCompany[1]);
        company = atCompany[2].trim();
      }
    }
  }

  if (!position) {
    const first = lines.find((line) => looksLikeTitle(stripTitleMeta(line)));
    if (first) {
      position = stripTitleMeta(first);
    }
  }

  if (!company) {
    const afterTitle = lines.find((line) => {
      const stripped = stripTitleMeta(line);
      return stripped !== position && looksLikeCompany(stripped) && !FIELD_LABEL.test(line);
    });
    if (afterTitle && afterTitle.length <= 48) {
      company = stripTitleMeta(afterTitle);
    }
  }

  return {
    position: position || "Pasted role",
    company: company || null,
    location: location || null,
    url,
    description,
    tags: tagsFrom(description, position),
  };
}
