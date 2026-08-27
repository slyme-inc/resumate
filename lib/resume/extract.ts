import {
  htmlToPlainText,
  linksFromHtml,
  mergeLinks,
  withVisibleAnchorText,
} from "@/lib/resume/links";
import { extractPdfDocument } from "@/lib/resume/pdf-text";
import mammoth from "mammoth";

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
    throw new Error("Save the file as PDF or DOCX.");
  }
  if (extension !== ".pdf" && extension !== ".docx") {
    throw new Error("Use a PDF or DOCX file.");
  }
}

function assertFileSignature(fileName: string, bytes: Uint8Array) {
  const extension = extensionOf(fileName);
  if (extension === ".pdf") {
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    if (!header.startsWith("%PDF")) {
      throw new Error("That file is not a valid PDF.");
    }
    return;
  }

  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error("That file is not a valid DOCX.");
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

export async function extractResumeDocument(fileName: string, bytes: Uint8Array) {
  assertResumeFile(fileName, bytes.byteLength);
  assertFileSignature(fileName, bytes);

  const extension = extensionOf(fileName);
  const extracted =
    extension === ".pdf" ? await extractPdfDocument(bytes) : await extractDocx(bytes);

  if (!extracted.text) {
    throw new Error("We could not read any text from that file.");
  }

  return {
    text: extracted.text,
    links: mergeLinks([extracted.links]),
  };
}
