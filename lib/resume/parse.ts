import { extractResumeDocument } from "./extract";
import { structureResume } from "./structure";
import type { ParsedResume } from "./types";
import { assertLooksLikeResume } from "./validate";

export async function parseResumeFile(
  fileName: string,
  bytes: Uint8Array,
): Promise<ParsedResume> {
  // pdf.js transfers the typed array into its worker, which detaches the
  // caller's buffer. A copy keeps the original bytes available to store.
  const extracted = await extractResumeDocument(fileName, bytes.slice());
  const resume = structureResume(extracted.text, fileName, extracted.links);
  assertLooksLikeResume(resume);
  return resume;
}

export type { ParsedResume } from "./types";
