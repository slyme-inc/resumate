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

const SKIP_PATH_TOKENS = new Set([
  "in",
  "pub",
  "company",
  "school",
  "org",
  "users",
  "www",
  "http",
  "https",
]);

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
  const isUrlLabel =
    !cleanLabel ||
    /^https?:\/\//i.test(cleanLabel) ||
    cleanLabel.replace(/^https?:\/\//i, "") === url.replace(/^https?:\/\//i, "");
  return {
    label: isUrlLabel ? labelFromUrl(url) : cleanLabel,
    url,
  };
}

export function linkMatchTokens(link: ResumeLink) {
  const tokens = new Set<string>();
  const add = (value: string) => {
    const trimmed = value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (trimmed.length >= 3 && !/^https?:\/\//i.test(trimmed) && !SKIP_PATH_TOKENS.has(trimmed.toLowerCase())) {
      tokens.add(trimmed);
    }
  };

  add(link.label);
  for (const part of link.label.split(/[/|•·,]+/)) {
    add(part);
  }

  try {
    const parsed = new URL(link.url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host.includes("github")) {
      add("GitHub");
    }
    if (host.includes("linkedin")) {
      add("LinkedIn");
    }
    if (host.includes("gitlab")) {
      add("GitLab");
    }
    if (host.includes("twitter") || host === "x.com") {
      add("Twitter");
    }
    const handle = parsed.pathname.split("/").filter(Boolean)[0];
    if (handle) {
      add(decodeURIComponent(handle));
    }
  } catch {
    // mailto: and tel: have no host to match
  }

  return [...tokens];
}

export function isLinkOnlyLine(line: string, links: ResumeLink[]) {
  const tokens = line.split(/[\s|•·,/+-]+/).filter(Boolean);
  if (tokens.length === 0 || links.length === 0) {
    return false;
  }

  const needles = links.flatMap((link) => linkMatchTokens(link).map((token) => token.toLowerCase()));
  return tokens.every((token) => {
    const key = token.toLowerCase();
    return needles.some((needle) => needle === key || needle.includes(key) || key.includes(needle));
  });
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

export function withVisibleAnchorText(html: string) {
  return html.replace(
    /<a\b([^>]*href\s*=\s*["']([^"']+)["'][^>]*)>([\s\S]*?)<\/a>/gi,
    (full, attrs: string, href: string, inner: string) => {
      const text = inner.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      if (text) {
        return full;
      }
      const link = toResumeLink("", href);
      return `<a${attrs}>${link?.label ?? href}</a>`;
    },
  );
}

export function htmlToPlainText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
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
