import {
  htmlToPlainText,
  linksFromHtml,
  mergeLinks,
  withVisibleAnchorText,
} from "@/lib/resume/links";
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
  if (extension === ".doc" || extension === ".pdf") {
    throw new Error("Save the file as DOCX from Word or Google Docs.");
  }
  if (extension !== ".docx") {
    throw new Error("Use a Word (.docx) file.");
  }
}

function assertFileSignature(bytes: Uint8Array) {
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
  assertFileSignature(bytes);

  const extracted = await extractDocx(bytes);
  if (!extracted.text) {
    throw new Error("We could not read any text from that file.");
  }

  return {
    text: extracted.text,
    links: mergeLinks([extracted.links]),
  };
}
