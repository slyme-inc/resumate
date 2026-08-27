const BLOCK_TAGS = /<\/(p|div|li|ul|ol|h[1-6]|tr|table|section|br)>/gi;

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
      .replace(BLOCK_TAGS, "\n")
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

/** Split cleaned description text into displayable paragraphs and bullets. */
export function toParagraphs(value: string) {
  return htmlToText(value)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
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
