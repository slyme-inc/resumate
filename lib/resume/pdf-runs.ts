export type PdfTextRun = {
  id: string;
  pageIndex: number;
  text: string;
  originalText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  added: boolean;
};

export type PdfImageOverlay = {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;
};

export type PdfPageSize = {
  width: number;
  height: number;
};

export type PdfGlyph = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  hasEOL: boolean;
};

function multiply(left: number[], right: number[]) {
  return [
    left[0] * right[0] + left[2] * right[1],
    left[1] * right[0] + left[3] * right[1],
    left[0] * right[2] + left[2] * right[3],
    left[1] * right[2] + left[3] * right[3],
    left[0] * right[4] + left[2] * right[5] + left[4],
    left[1] * right[4] + left[3] * right[5] + left[5],
  ];
}

export function glyphFromTextItem(
  item: {
    str: string;
    transform: number[];
    width: number;
    fontName: string;
    hasEOL?: boolean;
  },
  viewportTransform: number[],
  style?: { fontFamily?: string; ascent?: number },
): PdfGlyph | null {
  const str = item.str;
  if (!str) {
    return null;
  }
  const tx = multiply(viewportTransform, item.transform);
  const fontSize = Math.hypot(tx[2], tx[3]) || Math.hypot(tx[0], tx[1]);
  if (fontSize < 0.5) {
    return null;
  }
  const sourceScale = Math.hypot(item.transform[0], item.transform[1]) || 1;
  const widthScale = Math.hypot(tx[0], tx[1]);
  const width = Math.max(item.width * (widthScale / sourceScale), str.length ? fontSize * 0.3 : 0);
  const fontFamily = style?.fontFamily || item.fontName || "sans-serif";
  const lower = `${fontFamily} ${item.fontName}`.toLowerCase();
  const ascent = style?.ascent && style.ascent > 0 ? style.ascent : 0.8;
  return {
    str,
    x: tx[4],
    y: tx[5] - fontSize * ascent,
    width,
    height: fontSize,
    fontSize,
    fontFamily,
    bold: /bold|black|heavy|semibold/i.test(lower),
    italic: /italic|oblique/i.test(lower),
    hasEOL: Boolean(item.hasEOL),
  };
}

function sameLine(left: PdfGlyph, right: PdfGlyph) {
  return Math.abs(left.y - right.y) <= Math.max(left.height, right.height) * 0.45;
}

function canJoin(left: PdfGlyph, right: PdfGlyph) {
  if (!sameLine(left, right)) {
    return false;
  }
  if (left.bold !== right.bold || left.italic !== right.italic) {
    return false;
  }
  if (Math.abs(left.fontSize - right.fontSize) > 0.6) {
    return false;
  }
  const gap = right.x - (left.x + left.width);
  return gap <= Math.max(left.fontSize, right.fontSize) * 0.55;
}

export function groupPdfGlyphs(pageIndex: number, glyphs: PdfGlyph[]): PdfTextRun[] {
  const ordered = [...glyphs]
    .filter((glyph) => glyph.str.trim().length > 0 || glyph.hasEOL)
    .sort((a, b) => (Math.abs(a.y - b.y) > 1 ? a.y - b.y : a.x - b.x));

  const runs: PdfTextRun[] = [];
  let current: PdfGlyph[] = [];

  function flush() {
    if (current.length === 0) {
      return;
    }
    const text = current.map((glyph) => glyph.str).join("").replace(/\s+/g, " ").trim();
    if (!text) {
      current = [];
      return;
    }
    const first = current[0];
    const last = current[current.length - 1];
    const x = Math.min(...current.map((glyph) => glyph.x));
    const y = Math.min(...current.map((glyph) => glyph.y));
    const right = last.x + last.width;
    const bottom = Math.max(...current.map((glyph) => glyph.y + glyph.height));
    runs.push({
      id: `p${pageIndex}-r${runs.length}`,
      pageIndex,
      text,
      originalText: text,
      x,
      y,
      width: Math.max(right - x, first.fontSize),
      height: Math.max(bottom - y, first.fontSize),
      fontSize: first.fontSize,
      fontFamily: first.fontFamily,
      bold: first.bold,
      italic: first.italic,
      added: false,
    });
    current = [];
  }

  for (const glyph of ordered) {
    const last = current[current.length - 1];
    if (!last || canJoin(last, glyph)) {
      current.push(glyph);
      if (glyph.hasEOL) {
        flush();
      }
      continue;
    }
    flush();
    current.push(glyph);
    if (glyph.hasEOL) {
      flush();
    }
  }
  flush();
  return runs;
}

export function cssFontFamily(fontFamily: string) {
  const lower = fontFamily.toLowerCase();
  if (lower.includes("courier") || lower.includes("mono")) {
    return `"Courier New", Courier, monospace`;
  }
  if (
    lower.includes("times") ||
    lower.includes("georgia") ||
    lower.includes("garamond") ||
    lower.includes("cambria") ||
    (lower.includes("serif") && !lower.includes("sans"))
  ) {
    return `"Times New Roman", Times, serif`;
  }
  return `Helvetica, Arial, sans-serif`;
}

export function isRunDirty(run: PdfTextRun) {
  return run.added || run.text !== run.originalText;
}
