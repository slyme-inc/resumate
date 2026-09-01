const BLOCK_TAGS = /<\/(p|div|li|ul|ol|h[1-6]|tr|table|section)>/gi;
const BREAK_TAGS = /<br\s*\/?>/gi;

const LIST_PREFIX = /^(?:[-*•●◦·–—▪▸►]\s+|\d+[.)]\s+|\(\d+\)\s+)/u;
const SECTION_HEADING =
  /^(about(?:\s+us|\s+the\s+(?:role|job|company))|overview|description|the role|what you(?:'ll| will) do|what we(?:'re| are) looking for|who you are|responsibilities|key responsibilities|job responsibilities|requirements|qualifications|benefits|perks|nice to have|must have|preferred qualifications|our mission|how we work|statement of work|why (?:us|you(?:'ll| will) love)|life at)\b/i;

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
  hellip: "…",
  bull: "•",
};

function decodeEntities(value: string) {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body: string) => {
    if (body.startsWith("#")) {
      const code = body.startsWith("#x") || body.startsWith("#X")
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[body.toLowerCase()] ?? match;
  });
}

/**
 * Roughly a third of scraped descriptions arrive as HTML fragments, so every
 * consumer needs plain text before it can match or display anything.
 */
export function htmlToText(value: string) {
  return decodeEntities(
    value
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(BREAK_TAGS, "\n")
      .replace(BLOCK_TAGS, "\n\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\r/g, "")
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

function isListItem(line: string) {
  return LIST_PREFIX.test(line);
}

function isLabel(line: string) {
  return line.length <= 48 && /[:：]$/.test(line);
}

/** "Role Title: Senior Engineer" — a field, not a sentence. */
function isLabeledValue(line: string) {
  const colon = line.search(/[:：]\s+\S/);
  return colon > 0 && colon <= 56 && !/[.!?]$/.test(line.slice(0, colon));
}

function isSectionHeading(line: string) {
  if (line.length > 72) {
    return false;
  }
  return SECTION_HEADING.test(line);
}

function isStructuralStart(line: string) {
  return isListItem(line) || isSectionHeading(line) || isLabel(line);
}

function isFragment(line: string) {
  return line.length < 40 && !isStructuralStart(line) && !isLabeledValue(line) && !/[.!?]$/.test(line);
}

function shouldJoin(prev: string, next: string) {
  if (isListItem(prev) || isStructuralStart(next)) {
    return false;
  }

  // ", we are hiring" / "and write code" — the next line continues the sentence.
  if (/^[,.;:!?)}'"”’]/.test(next) || /^[a-z]/.test(next)) {
    return true;
  }

  // "Role Title:" + "Senior Platform Engineer"
  if (isLabel(prev) && next.length <= 80 && !/[.!?]/.test(next) && !isLabeledValue(next)) {
    return true;
  }

  if (isLabel(prev) || isLabeledValue(prev) || isSectionHeading(prev) || /[.!?;]$/.test(prev)) {
    return false;
  }

  // Metadata rows like "Remote | Full-Time | Senior" should stay on their own line.
  if (/\s\|\s/.test(prev)) {
    return false;
  }

  // Two long capitalized blocks are real paragraphs, even if the first
  // scraped line dropped its period. Short leftovers still glue.
  if (prev.length >= 60 && next.length >= 60 && /^[\p{Lu}]/u.test(next)) {
    return false;
  }

  return true;
}

function joinText(prev: string, next: string) {
  const left = prev.trimEnd();
  const right = next.trimStart();
  const prevWords = left.split(/\s+/);

  for (let n = Math.min(4, prevWords.length); n >= 1; n -= 1) {
    const phrase = prevWords.slice(-n).join(" ");
    if (
      /^[\p{Lu}]/u.test(phrase) &&
      (right === phrase || right.toLowerCase().startsWith(`${phrase.toLowerCase()} `))
    ) {
      return `${left}${right.slice(phrase.length)}`.replace(/ +([,.;:!?)}'"”’])/g, "$1");
    }
  }

  const gap = /^[,.;:!?)}'"”’]/.test(right) ? "" : " ";
  return `${left}${gap}${right}`.replace(/ +([,.;:!?)}'"”’])/g, "$1");
}

/**
 * Split cleaned description text into displayable paragraphs and bullets.
 *
 * Scraped postings often wrap inline emphasis (company names, titles) onto
 * their own lines, so a naive split-on-newline turns "At Acme, we…" into
 * three stacked fragments. Rejoin those, but keep real headings and lists.
 */
export function toParagraphs(value: string) {
  const lines = htmlToText(value)
    .split("\n")
    .map((line) => line.trim());

  const paragraphs: string[] = [];
  let current = "";
  let gluedFragment = false;

  const flush = () => {
    if (current) {
      paragraphs.push(current);
    }
    current = "";
    gluedFragment = false;
  };

  for (const line of lines) {
    if (!line) {
      flush();
      continue;
    }
    if (!current) {
      current = line;
      continue;
    }

    if (shouldJoin(current, line) || (gluedFragment && !isStructuralStart(line))) {
      current = joinText(current, line);
      gluedFragment = isFragment(line) && !isLabeledValue(current);
      continue;
    }

    flush();
    current = line;
  }

  flush();
  return paragraphs;
}

export function paragraphKind(text: string): "heading" | "list" | "body" {
  if (isListItem(text)) {
    return "list";
  }
  if (isSectionHeading(text) || isLabel(text)) {
    return "heading";
  }
  return "body";
}

export function stripListPrefix(text: string) {
  return text.replace(LIST_PREFIX, "");
}

/**
 * Lowercase and flatten punctuation while preserving the characters that carry
 * meaning inside technology names: `c++`, `c#`, `node.js`, `ci/cd`.
 */
export function normalizeForMatch(value: string) {
  return htmlToText(value)
    .toLowerCase()
    .replace(/[^a-z0-9+#.\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(value: string) {
  const normalized = normalizeForMatch(value);
  if (!normalized) {
    return [];
  }
  return normalized.split(" ").filter(Boolean).map(trimToken).filter(Boolean);
}

/** Strip trailing punctuation that survives normalization (`react.` -> `react`). */
function trimToken(token: string) {
  let result = token;
  while (result.length > 1 && (result.endsWith(".") || result.endsWith("-"))) {
    result = result.slice(0, -1);
  }
  while (result.length > 1 && result.startsWith("-")) {
    result = result.slice(1);
  }
  return result;
}

export function truncate(value: string, max: number) {
  const clean = value.trim();
  if (clean.length <= max) {
    return clean;
  }
  return `${clean.slice(0, max).replace(/\s+\S*$/, "")}…`;
}
