import { linkMatchTokens } from "@/lib/resume/links";
import type { ResumeLink } from "@/lib/resume/types";
import type { ReactNode } from "react";

const URL_RE =
  /https?:\/\/[^\s<]+|www\.[^\s<]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:linkedin|github|gitlab)\.com\/[^\s,]+/gi;

function hrefFor(token: string) {
  if (token.includes("@") && !token.includes("/")) {
    return `mailto:${token}`;
  }
  if (/^https?:\/\//i.test(token)) {
    return token;
  }
  return `https://${token}`;
}

function isWordChar(char: string | undefined) {
  return Boolean(char && /[A-Za-z0-9]/i.test(char));
}

function findAll(text: string, needle: string) {
  const haystack = text.toLowerCase();
  const match = needle.toLowerCase();
  const ranges: Array<{ start: number; end: number }> = [];
  let from = 0;

  while (from <= haystack.length - match.length) {
    const index = haystack.indexOf(match, from);
    if (index < 0) {
      break;
    }
    if (!isWordChar(text[index - 1]) && !isWordChar(text[index + match.length])) {
      ranges.push({ start: index, end: index + needle.length });
    }
    from = index + match.length;
  }

  return ranges;
}

const LINK_CLASS =
  "text-forest underline decoration-forest/30 underline-offset-2 hover:decoration-forest";

export function LinkedText({
  text,
  links,
}: {
  text: string;
  links: ResumeLink[];
}) {
  const ranges: Array<{ start: number; end: number; href: string }> = [];

  for (const match of text.matchAll(URL_RE)) {
    if (match.index === undefined) {
      continue;
    }
    ranges.push({
      start: match.index,
      end: match.index + match[0].length,
      href: hrefFor(match[0].replace(/[.,;]+$/, "")),
    });
  }

  const labels = [...links]
    .flatMap((link) =>
      linkMatchTokens(link).map((token) => ({ token, href: link.url })),
    )
    .sort((left, right) => right.token.length - left.token.length);

  for (const label of labels) {
    for (const found of findAll(text, label.token)) {
      const overlaps = ranges.some((range) => found.start < range.end && found.end > range.start);
      if (overlaps) {
        continue;
      }
      ranges.push({ start: found.start, end: found.end, href: label.href });
    }
  }

  ranges.sort((left, right) => left.start - right.start || right.end - left.end);

  const kept: typeof ranges = [];
  for (const range of ranges) {
    const last = kept[kept.length - 1];
    if (last && range.start < last.end) {
      continue;
    }
    kept.push(range);
  }

  if (kept.length === 0) {
    return text;
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const [index, range] of kept.entries()) {
    if (cursor < range.start) {
      nodes.push(text.slice(cursor, range.start));
    }
    nodes.push(
      <a
        key={`${range.href}-${index}`}
        href={range.href}
        target={range.href.startsWith("mailto:") ? undefined : "_blank"}
        rel={range.href.startsWith("mailto:") ? undefined : "noreferrer"}
        className={LINK_CLASS}
      >
        {text.slice(range.start, range.end)}
      </a>,
    );
    cursor = range.end;
  }
  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}
