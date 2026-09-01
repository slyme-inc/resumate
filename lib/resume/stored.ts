import { toResumeLink } from "./links";
import type { ParsedResume, ResumeLink, ResumeOverlay } from "./types";

function asResumeOverlays(value: unknown): ResumeOverlay[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const overlays: ResumeOverlay[] = [];
  for (const item of value) {
    if (
      item &&
      typeof item === "object" &&
      "from" in item &&
      "to" in item &&
      typeof item.from === "string" &&
      typeof item.to === "string"
    ) {
      overlays.push({ from: item.from, to: item.to });
    }
  }
  return overlays.length > 0 ? overlays : undefined;
}

function asResumeLinks(value: unknown): ResumeLink[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const links: ResumeLink[] = [];
  for (const item of value) {
    if (typeof item === "string") {
      const link = toResumeLink(item, item);
      if (link) {
        links.push(link);
      }
      continue;
    }
    if (item && typeof item === "object" && "url" in item && typeof item.url === "string") {
      const label = "label" in item && typeof item.label === "string" ? item.label : item.url;
      const link = toResumeLink(label, item.url);
      if (link) {
        links.push(link);
      }
    }
  }
  return links;
}

export function asParsedResume(value: unknown): ParsedResume | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const resume = value as ParsedResume;
  if (typeof resume.fileName !== "string" || typeof resume.rawText !== "string") {
    return null;
  }
  if (!Array.isArray(resume.sections)) {
    return null;
  }

  return {
    ...resume,
    links: asResumeLinks(resume.links),
    overlays: asResumeOverlays(resume.overlays),
  };
}
