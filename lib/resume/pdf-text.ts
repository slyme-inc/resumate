import { labelFromUrl, mergeLinks, toResumeLink } from "@/lib/resume/links";
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

type PdfRect = [number, number, number, number];

function orderRect(rect: number[]): PdfRect | null {
  if (rect.length < 4) {
    return null;
  }
  const x1 = Math.min(rect[0], rect[2]);
  const y1 = Math.min(rect[1], rect[3]);
  const x2 = Math.max(rect[0], rect[2]);
  const y2 = Math.max(rect[1], rect[3]);
  if (x2 - x1 < 1 && y2 - y1 < 1) {
    return null;
  }
  return [x1, y1, x2, y2];
}

function rectsFromAnnotation(record: {
  rect?: number[];
  quadPoints?: number[];
}): PdfRect[] {
  const quads = record.quadPoints;
  if (Array.isArray(quads) && quads.length >= 8) {
    const rects: PdfRect[] = [];
    for (let index = 0; index + 7 < quads.length; index += 8) {
      const xs = [quads[index], quads[index + 2], quads[index + 4], quads[index + 6]];
      const ys = [quads[index + 1], quads[index + 3], quads[index + 5], quads[index + 7]];
      const rect = orderRect([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]);
      if (rect) {
        rects.push(rect);
      }
    }
    if (rects.length > 0) {
      return rects;
    }
  }
  const fallback = orderRect(record.rect ?? []);
  return fallback ? [fallback] : [];
}

function itemOverlapsRect(item: TextItem, rect: PdfRect) {
  const [x1, y1, x2, y2] = rect;
  const midX = item.x + Math.max(item.width, 1) / 2;
  const midY = item.y + Math.max(item.height, item.fontSize, 1) * 0.3;
  return midX >= x1 && midX <= x2 && midY >= y1 && midY <= y2;
}

function syntheticItem(label: string, rect: PdfRect): TextItem {
  const [x1, y1, x2, y2] = rect;
  const height = Math.max(y2 - y1, 10);
  return {
    str: label,
    x: x1,
    y: y1,
    width: Math.max(x2 - x1, label.length * height * 0.4),
    height,
    fontSize: height,
  };
}

function annotationHref(record: { url?: string; unsafeUrl?: string }) {
  return record.url || record.unsafeUrl || "";
}

function annotationOverlay(record: {
  title?: string;
  contents?: string;
  overlaidText?: string;
  contentsObj?: { str?: string };
}) {
  return (
    record.overlaidText?.trim() ||
    record.title?.trim() ||
    record.contents?.trim() ||
    record.contentsObj?.str?.trim() ||
    ""
  );
}

async function extractPdfLinksAndText(
  pdf: Awaited<ReturnType<typeof getDocumentProxy>>,
  pages: TextItem[][],
) {
  const links: ResumeLink[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const items = pages[pageNumber - 1] ?? [];
    const annotations = await (await pdf.getPage(pageNumber)).getAnnotations();
    for (const annotation of annotations) {
      const record = annotation as {
        subtype?: string;
        url?: string;
        unsafeUrl?: string;
        title?: string;
        contents?: string;
        overlaidText?: string;
        contentsObj?: { str?: string };
        rect?: number[];
        quadPoints?: number[];
      };
      if (record.subtype !== "Link") {
        continue;
      }
      const href = annotationHref(record);
      const rects = rectsFromAnnotation(record);
      const overlapping = items.filter((item) =>
        rects.some((rect) => itemOverlapsRect(item, rect)),
      );
      const visible = joinFragments(overlapping);
      const overlay = annotationOverlay(record);
      const link = toResumeLink(visible || overlay || href, href);
      if (!link) {
        continue;
      }
      links.push(link);
      if (!visible && rects[0]) {
        items.push(syntheticItem(link.label || labelFromUrl(link.url), rects[0]));
      }
    }
  }

  return mergeLinks([links]);
}

export async function extractPdfDocument(bytes: Uint8Array) {
  const pdf = await getDocumentProxy(bytes);
  const { items } = await extractTextItems(pdf);
  const links = await extractPdfLinksAndText(pdf, items);
  const text = items
    .map((page) => linesFromItems(page).join("\n"))
    .filter((page) => page.trim().length > 0)
    .join("\n\n")
    .trim();

  return { text, links };
}
