import {
  htmlToPlainText,
  linksFromHtml,
  linksFromText,
  mergeLinks,
  toResumeLink,
  withVisibleAnchorText,
} from "@/lib/resume/links";
import type { ResumeLink } from "@/lib/resume/types";
import mammoth from "mammoth";
import { extractLinks, extractText } from "unpdf";

const MAX_BYTES = 5 * 1024 * 1024;

function extensionOf(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot).toLowerCase() : "";
}

export function assertResumeFile(fileName: string, byteLength: number) {
  if (byteLength === 0) {
    throw new Error("That file is empty.");
  }
  if (byteLength > MAX_BYTES) {
    throw new Error("Keep the résumé under 5 MB.");
  }

  const extension = extensionOf(fileName);
  if (extension === ".doc") {
    throw new Error("Save the file as DOCX from Word or Google Docs.");
  }
  if (extension !== ".docx" && extension !== ".pdf") {
    throw new Error("Use a Word (.docx) or PDF file.");
  }
}

function assertDocxSignature(bytes: Uint8Array) {
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error("That file is not a valid DOCX.");
  }
}

function assertPdfSignature(bytes: Uint8Array) {
  if (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
    throw new Error("That file is not a valid PDF.");
  }
}

async function extractDocx(bytes: Uint8Array) {
  const buffer = Buffer.from(bytes);
  const [textResult, htmlResult] = await Promise.all([
    mammoth.extractRawText({ buffer }),
    mammoth.convertToHtml({ buffer }),
  ]);

  const html = withVisibleAnchorText(htmlResult.value);
  const links = linksFromHtml(html);
  const rawText = textResult.value.trim();
  const htmlText = htmlToPlainText(html);
  const missingLinkText = links.some(
    (link) =>
      Boolean(link.label) &&
      !rawText.toLowerCase().includes(link.label.toLowerCase()) &&
      !rawText.toLowerCase().includes(link.url.toLowerCase()),
  );

  return {
    text: missingLinkText && htmlText ? htmlText : rawText,
    links,
  };
}

async function extractPdf(bytes: Uint8Array) {
  const [{ text }, { links: hrefs }] = await Promise.all([
    extractText(bytes.slice(), { mergePages: true }),
    extractLinks(bytes.slice()),
  ]);
  const raw = text.trim();
  const fromPdf = hrefs
    .map((href) => toResumeLink(href, href))
    .filter((link): link is ResumeLink => Boolean(link));

  return {
    text: raw,
    links: mergeLinks([fromPdf, linksFromText(raw)]),
  };
}

export async function extractResumeDocument(fileName: string, bytes: Uint8Array) {
  assertResumeFile(fileName, bytes.byteLength);
  const extension = extensionOf(fileName);
  let extracted;
  if (extension === ".pdf") {
    assertPdfSignature(bytes);
    extracted = await extractPdf(bytes);
  } else {
    assertDocxSignature(bytes);
    extracted = await extractDocx(bytes);
  }

  if (!extracted.text) {
    throw new Error(
      extension === ".pdf"
        ? "This PDF has no selectable text."
        : "We could not read any text from that file.",
    );
  }

  return {
    text: extracted.text,
    links: mergeLinks([extracted.links]),
  };
}
