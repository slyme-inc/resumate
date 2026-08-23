import { extractPdfText } from "@/lib/resume/pdf-text";
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

async function extractPdf(bytes: Uint8Array) {
  return extractPdfText(bytes);
}

async function extractDocx(bytes: Uint8Array) {
  const result = await mammoth.extractRawText({
    buffer: Buffer.from(bytes),
  });
  return result.value.trim();
}

export async function extractResumeText(fileName: string, bytes: Uint8Array) {
  assertResumeFile(fileName, bytes.byteLength);

  const extension = extensionOf(fileName);
  const text = extension === ".pdf" ? await extractPdf(bytes) : await extractDocx(bytes);

  if (!text) {
    throw new Error("We could not read any text from that file.");
  }

  return text;
}
