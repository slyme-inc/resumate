import { mergeLinks, toResumeLink } from "@/lib/resume/links";
import type { ResumeLink } from "@/lib/resume/types";
import { extractTextItems, getDocumentProxy } from "unpdf";

type TextItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
};

function lineTolerance(item: TextItem, other?: TextItem) {
  return Math.max(item.fontSize, other?.fontSize ?? item.fontSize, 8) * 0.4;
}

function joinFragments(parts: TextItem[]) {
  const ordered = [...parts].sort((left, right) => left.x - right.x);
  let text = "";

  for (const [index, part] of ordered.entries()) {
    const piece = part.str.replace(/\s+/g, " ");
    if (!piece) {
      continue;
    }
    if (index === 0 || text.length === 0) {
      text = piece.trimStart();
      continue;
    }

    const previous = ordered[index - 1];
    const gap = previous ? part.x - (previous.x + previous.width) : 0;
    const needsSpace =
      !text.endsWith(" ") &&
      !piece.startsWith(" ") &&
      gap > Math.max((previous?.fontSize ?? 10) * 0.12, 0.8);

    text += needsSpace ? ` ${piece}` : piece;
  }

  return text.replace(/\s+/g, " ").trim();
}

function linesFromItems(items: TextItem[]) {
  const useful = items.filter((item) => item.str.trim().length > 0);
  const sorted = [...useful].sort((left, right) => {
    if (Math.abs(left.y - right.y) > lineTolerance(left, right)) {
      return right.y - left.y;
    }
    return left.x - right.x;
  });

  const clustered: { y: number; size: number; parts: TextItem[] }[] = [];

  for (const item of sorted) {
    const current = clustered[clustered.length - 1];
    if (current && Math.abs(current.y - item.y) <= lineTolerance(item, current.parts[0])) {
      current.parts.push(item);
      continue;
    }
    clustered.push({
      y: item.y,
      size: item.fontSize || item.height || 12,
      parts: [item],
    });
  }

  const lines: string[] = [];

  for (const [index, cluster] of clustered.entries()) {
    const text = joinFragments(cluster.parts);
    if (text) {
      lines.push(text);
    }

    const next = clustered[index + 1];
    if (!next) {
      continue;
    }
    const gap = cluster.y - next.y;
    if (gap > cluster.size * 1.75) {
      lines.push("");
    }
  }

  return lines;
}

async function extractPdfLinks(pdf: Awaited<ReturnType<typeof getDocumentProxy>>) {
  const links: ResumeLink[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const annotations = await (await pdf.getPage(pageNumber)).getAnnotations();
    for (const annotation of annotations) {
      const record = annotation as {
        subtype?: string;
        url?: string;
        title?: string;
        contents?: string;
      };
      if (record.subtype !== "Link" || !record.url) {
        continue;
      }
      const link = toResumeLink(record.title || record.contents || record.url, record.url);
      if (link) {
        links.push(link);
      }
    }
  }

  return mergeLinks([links]);
}

export async function extractPdfDocument(bytes: Uint8Array) {
  const pdf = await getDocumentProxy(bytes);
  const [{ items }, links] = await Promise.all([extractTextItems(pdf), extractPdfLinks(pdf)]);
  const text = items
    .map((page) => linesFromItems(page).join("\n"))
    .filter((page) => page.trim().length > 0)
    .join("\n\n")
    .trim();

  return { text, links };
}
