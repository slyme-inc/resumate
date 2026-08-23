import type { ParsedResume } from "./types";

export function asParsedResume(value: unknown): ParsedResume | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const resume = value as ParsedResume;
  if (typeof resume.fileName !== "string" || typeof resume.rawText !== "string") {
    return null;
  }
  if (!Array.isArray(resume.sections) || !Array.isArray(resume.links)) {
    return null;
  }

  return resume;
}
