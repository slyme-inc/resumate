import type { PdfImageOverlay, PdfPageSize, PdfTextRun } from "@/lib/resume/pdf-runs";
import { isRunDirty } from "@/lib/resume/pdf-runs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function toWinAnsi(text: string) {
  return text
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/[\u00A0\u202F\u2007]/g, " ")
    .replace(/[•·∙●]/g, "-")
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, " ");
}

function pickFont(run: PdfTextRun) {
  const family = run.fontFamily.toLowerCase();
  const mono = family.includes("courier") || family.includes("mono");
  const serif =
    family.includes("times") ||
    family.includes("georgia") ||
    family.includes("garamond") ||
    family.includes("cambria") ||
    (family.includes("serif") && !family.includes("sans"));

  if (mono) {
    if (run.bold && run.italic) {
      return StandardFonts.CourierBoldOblique;
    }
    if (run.bold) {
      return StandardFonts.CourierBold;
    }
    if (run.italic) {
      return StandardFonts.CourierOblique;
    }
    return StandardFonts.Courier;
  }
  if (serif) {
    if (run.bold && run.italic) {
      return StandardFonts.TimesRomanBoldItalic;
    }
    if (run.bold) {
      return StandardFonts.TimesRomanBold;
    }
    if (run.italic) {
      return StandardFonts.TimesRomanItalic;
    }
    return StandardFonts.TimesRoman;
  }
  if (run.bold && run.italic) {
    return StandardFonts.HelveticaBoldOblique;
  }
  if (run.bold) {
    return StandardFonts.HelveticaBold;
  }
  if (run.italic) {
    return StandardFonts.HelveticaOblique;
  }
  return StandardFonts.Helvetica;
}

function jpegBytesFromDataUrl(dataUrl: string) {
  const encoded = dataUrl.split(",")[1];
  if (!encoded) {
    throw new Error("We could not read that image.");
  }
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function isJpeg(dataUrl: string) {
  return /^data:image\/jpe?g/i.test(dataUrl);
}

export async function exportEditedPdf(
  originalBytes: Uint8Array,
  runs: PdfTextRun[],
  images: PdfImageOverlay[],
  pages: PdfPageSize[],
): Promise<Blob> {
  const pdf = await PDFDocument.load(originalBytes.slice());
  const fontCache = new Map<StandardFonts, Awaited<ReturnType<PDFDocument["embedFont"]>>>();

  async function fontFor(run: PdfTextRun) {
    const name = pickFont(run);
    const cached = fontCache.get(name);
    if (cached) {
      return cached;
    }
    const embedded = await pdf.embedFont(name);
    fontCache.set(name, embedded);
    return embedded;
  }

  for (const run of runs) {
    if (!isRunDirty(run) && !run.added) {
      continue;
    }
    const page = pdf.getPage(run.pageIndex);
    const pageHeight = pages[run.pageIndex]?.height ?? page.getHeight();
    const y = pageHeight - run.y - run.height;
    if (!run.added) {
      page.drawRectangle({
        x: run.x - 0.6,
        y: y - 0.6,
        width: run.width + 1.2,
        height: run.height + 1.2,
        color: rgb(1, 1, 1),
        borderWidth: 0,
      });
    }
    if (!run.text.trim()) {
      continue;
    }
    const font = await fontFor(run);
    page.drawText(toWinAnsi(run.text), {
      x: run.x,
      y: pageHeight - run.y - run.fontSize * 0.82,
      size: Math.max(4, run.fontSize),
      font,
      color: rgb(0, 0, 0),
    });
  }

  for (const image of images) {
    const page = pdf.getPage(image.pageIndex);
    const pageHeight = pages[image.pageIndex]?.height ?? page.getHeight();
    const bytes = jpegBytesFromDataUrl(image.dataUrl);
    const embedded = isJpeg(image.dataUrl) ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes);
    page.drawImage(embedded, {
      x: image.x,
      y: pageHeight - image.y - image.height,
      width: image.width,
      height: image.height,
    });
  }

  const bytes = await pdf.save();
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy], { type: "application/pdf" });
}
