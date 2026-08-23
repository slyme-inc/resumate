import type { ParsedResume, ResumeBlock, ResumeSection } from "./types";

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_RE =
  /(?:\+?\d{1,3}[-.\s])?(?:\(?\d{3}\)?[-.\s])\d{3}[-.\s]\d{4}\b/;
const URL_RE = /\bhttps?:\/\/[^\s)]+/gi;
const BARE_LINK_RE =
  /\b(?:linkedin\.com\/in\/[^\s,]+|github\.com\/[^\s,]+|gitlab\.com\/[^\s,]+)\b/gi;
const LOCATION_RE =
  /\b[A-Z][A-Za-z .'-]+,\s*(?:[A-Z]{2}|[A-Z][A-Za-z .'-]+)\b/;

const SECTION_ALIASES: Array<{ match: string; title: string }> = [
  { match: "professional summary", title: "Summary" },
  { match: "work experience", title: "Experience" },
  { match: "professional experience", title: "Experience" },
  { match: "employment history", title: "Experience" },
  { match: "work history", title: "Experience" },
  { match: "technical skills", title: "Skills" },
  { match: "core competencies", title: "Skills" },
  { match: "core skills", title: "Skills" },
  { match: "summary", title: "Summary" },
  { match: "profile", title: "Summary" },
  { match: "objective", title: "Summary" },
  { match: "about", title: "Summary" },
  { match: "experience", title: "Experience" },
  { match: "employment", title: "Experience" },
  { match: "education", title: "Education" },
  { match: "skills", title: "Skills" },
  { match: "technologies", title: "Skills" },
  { match: "projects", title: "Projects" },
  { match: "certifications", title: "Certifications" },
  { match: "certificates", title: "Certifications" },
  { match: "licenses", title: "Certifications" },
  { match: "awards", title: "Awards" },
  { match: "honors", title: "Awards" },
  { match: "publications", title: "Publications" },
  { match: "languages", title: "Languages" },
  { match: "volunteer", title: "Volunteer" },
  { match: "volunteering", title: "Volunteer" },
  { match: "interests", title: "Interests" },
];

function normalizeText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanLine(line: string) {
  return line.replace(/[:|•·]/g, " ").replace(/\s+/g, " ").trim();
}

function sectionTitle(line: string) {
  const cleaned = cleanLine(line);
  if (!cleaned || cleaned.length > 40) {
    return null;
  }
  if (cleaned.split(/\s+/).length > 4) {
    return null;
  }

  const key = cleaned.toLowerCase();
  return SECTION_ALIASES.find((item) => key === item.match)?.title ?? null;
}

function isBullet(line: string) {
  return /^[-*•·–—]\s+\S/.test(line) || /^\d+[.)]\s+\S/.test(line);
}

function endsIncomplete(line: string) {
  return (
    /[A-Za-z]-$/.test(line) ||
    /[,;:&+/|\\]$/.test(line) ||
    /[—–]$/.test(line) ||
    /\b(and|or|the|of|to|for|with|a|an|as|plus|including|across)$/i.test(line)
  );
}

function isSoftWrap(
  previous: string,
  next: string,
  options: { onlyIncomplete?: boolean } = {},
) {
  if (!previous || !next) {
    return false;
  }
  if (sectionTitle(previous) || sectionTitle(next)) {
    return false;
  }
  if (isBullet(next) || EMAIL_RE.test(next) || PHONE_RE.test(next)) {
    return false;
  }
  if (/https?:\/\//i.test(next) && !/https?:\/\//i.test(previous)) {
    return false;
  }
  if (endsIncomplete(previous)) {
    return true;
  }
  if (options.onlyIncomplete) {
    return false;
  }
  if (/^[a-z(]/.test(next) && !/[.!?:]$/.test(previous)) {
    return true;
  }
  if (/^(and|or|as|with|including|plus)\b/i.test(next) && !/[.!?:]$/.test(previous)) {
    return true;
  }
  if (
    previous.length < 56 &&
    !/[.!?:]$/.test(previous) &&
    !isBullet(previous) &&
    !/^\d{4}\b/.test(next)
  ) {
    return true;
  }
  return false;
}

function joinWrapped(left: string, right: string) {
  if (/[A-Za-z]-$/.test(left)) {
    return left.slice(0, -1) + right;
  }
  return `${left} ${right}`;
}

function reflowLines(lines: string[], options: { onlyIncomplete?: boolean } = {}) {
  const result: string[] = [];

  for (const line of lines) {
    if (line.length === 0) {
      if (result[result.length - 1] !== "") {
        result.push("");
      }
      continue;
    }

    let previousIndex = result.length - 1;
    let skippedBlank = false;
    if (result[previousIndex] === "") {
      previousIndex -= 1;
      skippedBlank = true;
    }

    const previous = result[previousIndex];
    if (previous && isSoftWrap(previous, line, options)) {
      if (skippedBlank) {
        result.pop();
      }
      result[previousIndex] = joinWrapped(previous, line);
      continue;
    }

    result.push(line);
  }

  return result;
}

function unique(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
  }
  return result;
}

function looksLikeName(line: string) {
  if (EMAIL_RE.test(line) || PHONE_RE.test(line) || /https?:\/\//i.test(line)) {
    return false;
  }
  const words = line.trim().split(/\s+/);
  if (words.length < 2 || words.length > 5) {
    return false;
  }
  if (line.length > 48) {
    return false;
  }
  return words.every((word) => /^[A-Za-z][A-Za-z.'-]*$/.test(word));
}

function collectLinks(text: string) {
  const urls = text.match(URL_RE) ?? [];
  const bare = text.match(BARE_LINK_RE) ?? [];
  return unique([
    ...urls.map((url) => url.replace(/[.,;]+$/, "")),
    ...bare.map((link) =>
      link.startsWith("http") ? link.replace(/[.,;]+$/, "") : `https://${link.replace(/[.,;]+$/, "")}`,
    ),
  ]);
}

function blocksFromLines(lines: string[]): ResumeBlock[] {
  const blocks: ResumeBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  function flushParagraph() {
    if (paragraph.length === 0) {
      return;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  }

  function flushList() {
    if (list.length === 0) {
      return;
    }
    blocks.push({ type: "list", items: list });
    list = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      const lastItem = list[list.length - 1];
      if (lastItem && endsIncomplete(lastItem)) {
        continue;
      }
      const lastParagraph = paragraph[paragraph.length - 1];
      if (lastParagraph && endsIncomplete(lastParagraph)) {
        continue;
      }
      flushParagraph();
      flushList();
      continue;
    }

    const bullet = trimmed.match(/^[-*•·–—]\s+(.+)/) ?? trimmed.match(/^\d+[.)]\s+(.+)/);
    if (bullet?.[1]) {
      flushParagraph();
      list.push(bullet[1].trim());
      continue;
    }

    const lastItem = list[list.length - 1];
    if (lastItem && isSoftWrap(lastItem, trimmed)) {
      list[list.length - 1] = joinWrapped(lastItem, trimmed);
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function blocksFromSkillLines(lines: string[]): ResumeBlock[] {
  return reflowLines(lines, { onlyIncomplete: true })
    .filter((line) => line.length > 0)
    .map((text) => ({ type: "paragraph" as const, text }));
}

export function structureResume(rawText: string, fileName: string): ParsedResume {
  const text = normalizeText(rawText);
  const rawLines = text.split("\n").map((line) => line.trim());
  const firstHeaderIndex = rawLines.findIndex((line) => sectionTitle(line));
  const headerLines = reflowLines(
    firstHeaderIndex === -1 ? rawLines.slice(0, 12) : rawLines.slice(0, firstHeaderIndex),
  );
  const headerText = headerLines.join("\n");

  const email = headerText.match(EMAIL_RE)?.[0] ?? text.match(EMAIL_RE)?.[0] ?? null;
  const phone = headerText.match(PHONE_RE)?.[0] ?? text.match(PHONE_RE)?.[0] ?? null;
  const location = headerText.match(LOCATION_RE)?.[0] ?? null;
  const links = collectLinks(headerText.length > 0 ? headerText : text);

  let name: string | null = null;
  let headline: string | null = null;

  for (const line of headerLines) {
    if (!line || EMAIL_RE.test(line) || PHONE_RE.test(line) || /https?:\/\//i.test(line)) {
      continue;
    }
    if (LOCATION_RE.test(line) && line === location) {
      continue;
    }
    if (!name && looksLikeName(line)) {
      name = line;
      continue;
    }
    if (name && !headline && line.length <= 80 && !sectionTitle(line)) {
      headline = line;
      break;
    }
  }

  const sections: ResumeSection[] = [];

  if (firstHeaderIndex === -1) {
    const body = reflowLines(rawLines).filter((line) => {
      if (!line) {
        return true;
      }
      if (line === name || line === headline || line === email || line === phone) {
        return false;
      }
      if (location && line.includes(location)) {
        return false;
      }
      return !links.some((link) => line.includes(link.replace(/^https?:\/\//, "")));
    });
    const blocks = blocksFromLines(body);
    if (blocks.length > 0) {
      sections.push({ title: "Résumé", blocks });
    }
  } else {
    const firstHeading = rawLines[firstHeaderIndex] ?? "Résumé";
    let currentKind = sectionTitle(firstHeading) ?? "Résumé";
    let currentTitle = firstHeading;
    let currentLines: string[] = [];

    function pushSection() {
      const blocks =
        currentKind === "Skills"
          ? blocksFromSkillLines(currentLines)
          : blocksFromLines(reflowLines(currentLines));
      if (blocks.length > 0) {
        sections.push({ title: currentTitle, blocks });
      }
      currentLines = [];
    }

    for (const line of rawLines.slice(firstHeaderIndex + 1)) {
      const nextKind = sectionTitle(line);
      if (nextKind) {
        pushSection();
        currentKind = nextKind;
        currentTitle = line;
        continue;
      }
      currentLines.push(line);
    }
    pushSection();
  }

  return {
    fileName,
    rawText: text,
    name,
    headline,
    email,
    phone,
    location,
    links,
    sections,
  };
}
