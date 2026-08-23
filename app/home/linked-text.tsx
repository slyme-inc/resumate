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
    .filter((link) => link.label.length >= 3 && !/^https?:\/\//i.test(link.label))
    .sort((left, right) => right.label.length - left.label.length);

  for (const link of labels) {
    const index = text.toLowerCase().indexOf(link.label.toLowerCase());
    if (index < 0) {
      continue;
    }
    const overlaps = ranges.some((range) => index < range.end && index + link.label.length > range.start);
    if (overlaps) {
      continue;
    }
    ranges.push({ start: index, end: index + link.label.length, href: link.url });
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
