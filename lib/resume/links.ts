import type { ResumeLink } from "./types";

const TEXT_URL_RE = /\bhttps?:\/\/[^\s<>)"']+/gi;
const BARE_LINK_RE =
  /\b(?:linkedin\.com\/in\/[^\s,]+|github\.com\/[^\s,]+|gitlab\.com\/[^\s,]+)\b/gi;
const MAILTO_RE = /^mailto:/i;
const UNSAFE_RE = /^(javascript|data|file|vbscript):/i;

export function normalizeHref(value: string) {
  const trimmed = value.trim().replace(/[.,;)\]]+$/, "");
  if (!trimmed || UNSAFE_RE.test(trimmed)) {
    return null;
  }
  if (MAILTO_RE.test(trimmed) || trimmed.startsWith("tel:")) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (/^www\./i.test(trimmed) || /^(linkedin|github|gitlab)\.com\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return null;
}

export function labelFromUrl(url: string) {
  if (MAILTO_RE.test(url)) {
    return url.replace(MAILTO_RE, "");
  }
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host.includes("linkedin")) {
      return "LinkedIn";
    }
    if (host.includes("github")) {
      const handle = parsed.pathname.split("/").filter(Boolean)[0];
      return handle ? `GitHub/${handle}` : "GitHub";
    }
    if (host.includes("gitlab")) {
      return "GitLab";
    }
    return host || url;
  } catch {
    return url.replace(/^https?:\/\//, "");
  }
}

export function toResumeLink(label: string, href: string): ResumeLink | null {
  const url = normalizeHref(href);
  if (!url) {
    return null;
  }
  const cleanLabel = label.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return {
    label: cleanLabel || labelFromUrl(url),
    url,
  };
}

export function mergeLinks(groups: ResumeLink[][]) {
  const seen = new Set<string>();
  const result: ResumeLink[] = [];
  for (const group of groups) {
    for (const link of group) {
      const key = link.url.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      result.push(link);
    }
  }
  return result;
}

export function linksFromText(text: string) {
  const urls = text.match(TEXT_URL_RE) ?? [];
  const bare = text.match(BARE_LINK_RE) ?? [];
  return mergeLinks([
    urls.map((url) => toResumeLink(url, url)).filter((link): link is ResumeLink => Boolean(link)),
    bare.map((value) => toResumeLink(value, value)).filter((link): link is ResumeLink => Boolean(link)),
  ]);
}

export function linksFromHtml(html: string) {
  const result: ResumeLink[] = [];
  const pattern = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(pattern)) {
    const link = toResumeLink(match[2] ?? "", match[1] ?? "");
    if (link) {
      result.push(link);
    }
  }
  return mergeLinks([result]);
}

export function emailFromLinks(links: ResumeLink[]) {
  for (const link of links) {
    if (MAILTO_RE.test(link.url)) {
      return link.url.replace(MAILTO_RE, "");
    }
  }
  return null;
}
