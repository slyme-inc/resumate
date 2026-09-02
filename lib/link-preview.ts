import { cacheLife } from "next/cache";

export type LinkPreview = {
  url: string;
  host: string;
  title: string;
  image: string | null;
  logo: string | null;
  siteName: string | null;
};

const FETCH_TIMEOUT_MS = 3_500;
const MAX_HEAD_BYTES = 180_000;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const PRIVATE_HOST =
  /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|169\.254\.\d+\.\d+)$/i;

export function toPreviewUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    if (PRIVATE_HOST.test(url.hostname) || url.hostname.endsWith(".local") || url.hostname.endsWith(".internal")) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    });
}

function cleanText(value: string | null, max = 140) {
  if (!value) {
    return null;
  }
  const text = decodeEntities(value)
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) {
    return null;
  }
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
}

function metaContent(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const named = `(?:property|name|itemprop)\\s*=\\s*["']${escaped}["']`;
  const content = `content\\s*=\\s*["']([^"']*)["']`;
  const namedFirst = html.match(new RegExp(`<meta\\s[^>]*${named}[^>]*${content}`, "i"));
  if (namedFirst?.[1]) {
    return namedFirst[1];
  }
  const contentFirst = html.match(new RegExp(`<meta\\s[^>]*${content}[^>]*${named}`, "i"));
  return contentFirst?.[1] ?? null;
}

function firstMeta(html: string, keys: string[], max = 140) {
  for (const key of keys) {
    const value = cleanText(metaContent(html, key), max);
    if (value) {
      return value;
    }
  }
  return null;
}

function isSignedAsset(url: string) {
  return /X-Amz-|[?&]signature=|[?&]expires=/i.test(url);
}

function tagAttr(tag: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const quoted = tag.match(new RegExp(`${escaped}\\s*=\\s*["']([^"']*)["']`, "i"));
  if (quoted?.[1]) {
    return quoted[1];
  }
  const bare = tag.match(new RegExp(`${escaped}\\s*=\\s*([^\\s>]+)`, "i"));
  return bare?.[1] ?? null;
}

function isIconRel(rel: string) {
  return rel.split(/\s+/).some(
    (token) => token === "icon" || token === "shortcut" || token.startsWith("apple-touch-icon"),
  );
}

function iconScore(rel: string, sizes: string | null, href: string) {
  let score = 0;
  if (rel.includes("apple-touch-icon")) {
    score += 80;
  }
  const dim = sizes?.match(/(\d+)\s*x\s*(\d+)/i);
  if (dim) {
    score += Math.max(Number(dim[1]), Number(dim[2]));
  } else if (sizes?.toLowerCase() === "any") {
    score += 90;
  }
  const path = href.toLowerCase();
  if (path.includes(".svg")) {
    score += 50;
  } else if (path.includes(".png") || path.includes(".webp")) {
    score += 25;
  } else if (path.includes(".jpg") || path.includes(".jpeg")) {
    score += 10;
  }
  return score;
}

function googleFavicon(host: string) {
  return `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(host.replace(/^www\./, ""))}`;
}

function pickLogo(html: string, base: URL) {
  const icons: { href: string; score: number }[] = [];
  const metaLogo = resolveUrl(firstMeta(html, ["og:logo", "msapplication-TileImage"], 2_000), base);
  if (metaLogo) {
    icons.push({ href: metaLogo, score: 70 });
  }

  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = (tagAttr(tag, "rel") ?? "").toLowerCase();
    if (!isIconRel(rel)) {
      continue;
    }
    const href = resolveUrl(tagAttr(tag, "href"), base);
    if (!href) {
      continue;
    }
    icons.push({ href, score: iconScore(rel, tagAttr(tag, "sizes"), href) });
  }

  icons.sort((left, right) => right.score - left.score);
  return icons[0]?.href ?? googleFavicon(base.hostname);
}

function titleTag(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return cleanText(match?.[1] ?? null, 140);
}

function resolveUrl(value: string | null, base: URL) {
  const cleaned = cleanText(value, 2_000);
  if (!cleaned) {
    return null;
  }
  try {
    const url = new URL(cleaned, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function fallbackPreview(url: URL): LinkPreview {
  const host = url.hostname.replace(/^www\./, "");
  return {
    url: url.toString(),
    host,
    title: host,
    image: null,
    logo: googleFavicon(host),
    siteName: null,
  };
}

async function readHeadHtml(response: Response) {
  if (!response.body) {
    return (await response.text()).slice(0, MAX_HEAD_BYTES);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let html = "";
  let bytes = 0;

  try {
    while (bytes < MAX_HEAD_BYTES) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      bytes += value.byteLength;
      html += decoder.decode(value, { stream: true });
      if (/<\/head>/i.test(html)) {
        break;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }

  return html;
}

async function fetchPreview(url: URL): Promise<LinkPreview> {
  const fallback = fallbackPreview(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.8",
        "User-Agent": USER_AGENT,
      },
    });
    if (!response.ok) {
      return fallback;
    }

    const type = response.headers.get("content-type") ?? "";
    if (type && !/html|xml|text\//i.test(type)) {
      return fallback;
    }

    const html = await readHeadHtml(response);
    const finalUrl = new URL(response.url || url.toString());
    const title =
      firstMeta(html, ["og:title", "twitter:title"]) ?? titleTag(html) ?? fallback.title;
    const siteName = firstMeta(html, ["og:site_name", "application-name"]);
    const image = resolveUrl(
      firstMeta(html, ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"], 2_000),
      finalUrl,
    );

    return {
      url: url.toString(),
      host: finalUrl.hostname.replace(/^www\./, ""),
      title,
      image,
      logo: pickLogo(html, finalUrl),
      siteName,
    };
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

export async function getLinkPreview(href: string): Promise<LinkPreview | null> {
  "use cache";

  const url = toPreviewUrl(href);
  if (!url) {
    cacheLife("hours");
    return null;
  }

  const preview = await fetchPreview(url);
  if (preview.image && !isSignedAsset(preview.image)) {
    cacheLife("days");
  } else {
    cacheLife("hours");
  }
  return preview;
}
