import { createElement, Fragment, type ReactNode } from "react";

type ReadmeContext = {
  assetBase: string;
  blobBase: string;
};

const LINKED_IMAGE =
  /^\[!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/;
const IMAGE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/;
const LINK = /^\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/;
const CODE = /^`([^`]+)`/;
const BOLD = /^\*\*([^*]+)\*\*|^__([^_]+)__/;
const ITALIC = /^\*(?!\*)([^*]+)\*(?!\*)|^_(?!_)([^_]+)_(?!_)/;

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function attr(tag: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(new RegExp(`${escaped}\\s*=\\s*["']([^"']*)["']`, "i"));
  return match?.[1] ? decodeEntities(match[1]) : null;
}

function isSafeHref(href: string) {
  if (href.startsWith("#") || href.startsWith("mailto:")) {
    return true;
  }
  try {
    const url = new URL(href);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function resolveHref(href: string, ctx: ReadmeContext, kind: "asset" | "link") {
  const trimmed = decodeEntities(href.trim());
  if (!trimmed || trimmed.toLowerCase().startsWith("javascript:")) {
    return null;
  }
  if (trimmed.startsWith("#") || trimmed.startsWith("mailto:")) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return isSafeHref(trimmed) ? trimmed : null;
  }
  const base = kind === "asset" ? ctx.assetBase : ctx.blobBase;
  try {
    return new URL(trimmed.replace(/^\.\//, "").replace(/^\//, ""), base).toString();
  } catch {
    return null;
  }
}

function isBadge(src: string, alt: string) {
  return (
    /shields\.io|badge|gitcgr\.com\/badge|trendshift\.io\/api\/badge|vercel\.com\/oss\/program-badge|github-readme-stats|img\.shields|for-the-badge/i.test(
      src,
    ) || /^(license|downloads?|npm|contributors|stars?|follow|join|build|coverage)/i.test(alt.trim())
  );
}

function protectFences(markdown: string) {
  const fences: string[] = [];
  const protectedMarkdown = markdown.replace(/```[\s\S]*?```/g, (block) => {
    fences.push(block);
    return `\n%%FENCE${fences.length - 1}%%\n`;
  });
  return { protectedMarkdown, fences };
}

function restoreFences(markdown: string, fences: string[]) {
  return markdown.replace(/%%FENCE(\d+)%%/g, (_, index: string) => fences[Number(index)] ?? "");
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, "");
}

function imageMarkdown(tag: string) {
  const src = attr(tag, "src");
  const alt = attr(tag, "alt") ?? "";
  return src ? `![${alt}](${src})` : "";
}

function preprocess(markdown: string) {
  const { protectedMarkdown, fences } = protectFences(markdown.replace(/\r\n/g, "\n"));
  const cleaned = protectedMarkdown
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<picture\b[^>]*>[\s\S]*?(<img\b[^>]*>)[\s\S]*?<\/picture>/gi, "$1")
    .replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (_full, rawAttrs: string, inner: string) => {
      const href = attr(`a ${rawAttrs}`, "href");
      if (!href) {
        return inner;
      }
      const imgTag = inner.match(/<img\b[^>]*>/i)?.[0];
      if (imgTag) {
        const src = attr(imgTag, "src");
        const alt = attr(imgTag, "alt") ?? "";
        if (src) {
          return `[![${alt}](${src})](${href})`;
        }
      }
      const text = stripTags(inner).replace(/\s+/g, " ").trim();
      return text ? `[${text}](${href})` : "";
    })
    .replace(/<img\b[^>]*>/gi, (tag) => imageMarkdown(tag))
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[^\S\n]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
  return restoreFences(cleaned, fences).trim();
}

function readmeImage(src: string, alt: string) {
  const badge = isBadge(src, alt);
  return createElement("img", {
    src,
    alt,
    className: badge
      ? "inline-block h-6 max-w-full align-middle"
      : "mx-auto max-h-28 max-w-[min(100%,20rem)] object-contain",
  });
}

function wrapLink(href: string, key: string, child: ReactNode) {
  return createElement(
    "a",
    {
      key,
      href,
      target: href.startsWith("#") ? undefined : "_blank",
      rel: href.startsWith("#") ? undefined : "noreferrer",
      className: "inline-flex font-semibold text-forest hover:underline",
    },
    child,
  );
}

function renderInline(text: string, ctx: ReadmeContext, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let index = 0;
  let textBuf = "";

  const flushText = () => {
    if (textBuf) {
      nodes.push(textBuf);
      textBuf = "";
    }
  };

  while (cursor < text.length) {
    const slice = text.slice(cursor);
    const key = `${keyPrefix}-${index}`;
    let matched: RegExpMatchArray | null = slice.match(LINKED_IMAGE);
    if (matched) {
      flushText();
      const src = resolveHref(matched[2] ?? "", ctx, "asset");
      const href = resolveHref(matched[3] ?? "", ctx, "link");
      const alt = matched[1] ?? "";
      const image = src ? readmeImage(src, alt) : alt;
      nodes.push(href ? wrapLink(href, key, image) : image);
      cursor += matched[0].length;
      index += 1;
      continue;
    }
    matched = slice.match(IMAGE);
    if (matched) {
      flushText();
      const src = resolveHref(matched[2] ?? "", ctx, "asset");
      nodes.push(src ? readmeImage(src, matched[1] ?? "") : (matched[1] ?? ""));
      cursor += matched[0].length;
      index += 1;
      continue;
    }
    matched = slice.match(LINK);
    if (matched) {
      flushText();
      const href = resolveHref(matched[2] ?? "", ctx, "link");
      const label = renderInline(matched[1] ?? "", ctx, `${key}-a`);
      nodes.push(href ? wrapLink(href, key, label) : label);
      cursor += matched[0].length;
      index += 1;
      continue;
    }
    matched = slice.match(CODE);
    if (matched) {
      flushText();
      nodes.push(
        createElement(
          "code",
          {
            key,
            className: "rounded-[6px] bg-paper px-1.5 py-0.5 font-mono text-[13px] text-ink",
          },
          matched[1] ?? "",
        ),
      );
      cursor += matched[0].length;
      index += 1;
      continue;
    }
    matched = slice.match(BOLD);
    if (matched) {
      flushText();
      nodes.push(
        createElement(
          "strong",
          { key, className: "font-semibold text-ink" },
          matched[1] ?? matched[2] ?? "",
        ),
      );
      cursor += matched[0].length;
      index += 1;
      continue;
    }
    matched = slice.match(ITALIC);
    if (matched) {
      flushText();
      nodes.push(createElement("em", { key }, matched[1] ?? matched[2] ?? ""));
      cursor += matched[0].length;
      index += 1;
      continue;
    }
    textBuf += text[cursor] ?? "";
    cursor += 1;
  }
  flushText();
  return nodes;
}

function isMediaLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }
  const rest = trimmed
    .replace(/\[!\[[^\]]*\]\([^)]+\)\]\([^)]+\)/g, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\s/g, "");
  return rest.length === 0;
}

function splitListItems(lines: string[], marker: RegExp) {
  const items: string[] = [];
  for (const line of lines) {
    const text = line.replace(marker, "").trim();
    if (marker.test(line) && !/^\s+/.test(line)) {
      items.push(text);
    } else if (items.length > 0) {
      items[items.length - 1] = `${items[items.length - 1]} ${text}`.trim();
    }
  }
  return items;
}

function parseTable(block: string) {
  const rows = block
    .trim()
    .split("\n")
    .map((line) =>
      line
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim()),
    );
  if (rows.length < 2) {
    return null;
  }
  const [headers, divider, ...body] = rows;
  if (!divider?.every((cell) => /^:?-+:?$/.test(cell.replace(/\s/g, "")))) {
    return null;
  }
  return { headers: headers ?? [], rows: body };
}

export function ReadmeMarkdown({
  markdown,
  assetBase,
  blobBase,
}: {
  markdown: string;
  assetBase: string;
  blobBase: string;
}) {
  const ctx = { assetBase, blobBase };
  const source = preprocess(markdown);
  const lines = source.split("\n");
  const nodes: ReactNode[] = [];
  let index = 0;
  let block = 0;

  const takeUntil = (predicate: (line: string) => boolean) => {
    const start = index;
    while (index < lines.length && predicate(lines[index] ?? "")) {
      index += 1;
    }
    return lines.slice(start, index);
  };

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const key = `b${block}`;
    block += 1;

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^```([\w-]+)?\s*$/);
    if (fence) {
      index += 1;
      const code = takeUntil((next) => !next.startsWith("```")).join("\n");
      if (lines[index]?.startsWith("```")) {
        index += 1;
      }
      nodes.push(
        createElement(
          "pre",
          {
            key,
            className:
              "my-4 overflow-x-auto rounded-[10px] border border-line bg-paper p-4 font-mono text-[13px] leading-relaxed text-ink",
          },
          createElement("code", null, code),
        ),
      );
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = Math.min(heading[1].length, 4);
      const sizes = ["text-2xl", "text-xl", "text-lg", "text-base"];
      const HeadingTag = `h${level}` as "h1" | "h2" | "h3" | "h4";
      nodes.push(
        createElement(
          HeadingTag,
          {
            key,
            className: `mt-6 font-serif ${sizes[level - 1]} font-medium tracking-tight text-ink first:mt-0`,
          },
          ...renderInline(heading[2] ?? "", ctx, key),
        ),
      );
      index += 1;
      continue;
    }

    if (/^([*\-_]\s*){3,}$/.test(line.trim())) {
      nodes.push(createElement("hr", { key, className: "my-6 border-line" }));
      index += 1;
      continue;
    }

    if (isMediaLine(line)) {
      const group = takeUntil((next) => isMediaLine(next));
      nodes.push(
        createElement(
          "p",
          {
            key,
            className: "my-4 flex flex-wrap items-center justify-center gap-2",
          },
          ...renderInline(group.join(" "), ctx, key),
        ),
      );
      continue;
    }

    if (line.startsWith(">")) {
      const quoted = takeUntil((next) => next.startsWith(">"))
        .map((item) => item.replace(/^>\s?/, ""))
        .join(" ");
      nodes.push(
        createElement(
          "blockquote",
          {
            key,
            className: "my-4 border-l-2 border-gold pl-4 text-[15px] leading-relaxed text-muted",
          },
          ...renderInline(quoted, ctx, key),
        ),
      );
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const group = takeUntil(
        (next) =>
          Boolean(next.trim()) &&
          (ordered
            ? /^\s*\d+\.\s+/.test(next) || /^\s{2,}\S/.test(next)
            : /^\s*[-*+]\s+/.test(next) || /^\s{2,}\S/.test(next)),
      );
      const items = splitListItems(group, ordered ? /^\s*\d+\.\s+/ : /^\s*[-*+]\s+/);
      nodes.push(
        createElement(
          ordered ? "ol" : "ul",
          {
            key,
            className: `${ordered ? "list-decimal" : "list-disc"} my-3 space-y-1.5 pl-5 text-[15px] leading-relaxed text-text`,
          },
          ...items.map((item, itemIndex) =>
            createElement("li", { key: `${key}-${itemIndex}` }, ...renderInline(item, ctx, `${key}-${itemIndex}`)),
          ),
        ),
      );
      continue;
    }

    if (line.includes("|") && lines[index + 1]?.includes("|") && /---/.test(lines[index + 1] ?? "")) {
      const tableLines = takeUntil((next) => next.includes("|"));
      const table = parseTable(tableLines.join("\n"));
      if (table) {
        nodes.push(
          createElement(
            "div",
            { key, className: "my-4 overflow-x-auto" },
            createElement(
              "table",
              { className: "w-full min-w-[36rem] border-collapse text-left text-sm" },
              createElement(
                "thead",
                null,
                createElement(
                  "tr",
                  { className: "border-b border-line" },
                  ...table.headers.map((header, headerIndex) =>
                    createElement(
                      "th",
                      {
                        key: `${key}-h${headerIndex}`,
                        className: "px-2 py-2 font-semibold tracking-tight text-ink",
                      },
                      ...renderInline(header, ctx, `${key}-h${headerIndex}`),
                    ),
                  ),
                ),
              ),
              createElement(
                "tbody",
                null,
                ...table.rows.map((row, rowIndex) =>
                  createElement(
                    "tr",
                    { key: `${key}-r${rowIndex}`, className: "border-b border-line/70" },
                    ...row.map((cell, cellIndex) =>
                      createElement(
                        "td",
                        {
                          key: `${key}-r${rowIndex}-c${cellIndex}`,
                          className: "px-2 py-2 text-text",
                        },
                        ...renderInline(cell, ctx, `${key}-r${rowIndex}-c${cellIndex}`),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
        continue;
      }
    }

    const paragraph = takeUntil(
      (next) =>
        Boolean(next.trim()) &&
        !next.startsWith("#") &&
        !next.startsWith("```") &&
        !next.startsWith(">") &&
        !isMediaLine(next) &&
        !/^\s*[-*+]\s+/.test(next) &&
        !/^\s*\d+\.\s+/.test(next),
    ).join(" ");
    nodes.push(
      createElement(
        "p",
        { key, className: "my-3 text-[15px] leading-relaxed text-text" },
        ...renderInline(paragraph, ctx, key),
      ),
    );
  }

  return createElement(Fragment, null, ...nodes);
}
