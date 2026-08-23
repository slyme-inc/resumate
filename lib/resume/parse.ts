import { extractResumeText } from "./extract";
import { structureResume } from "./structure";
import type { ParsedResume } from "./types";

export async function parseResumeFile(
  fileName: string,
  bytes: Uint8Array,
): Promise<ParsedResume> {
  const rawText = await extractResumeText(fileName, bytes);
  return structureResume(rawText, fileName);
}

export type { ParsedResume } from "./types";
