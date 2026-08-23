import type { ParsedResume } from "./types";

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_RE =
  /(?:\+?\d{1,3}[-.\s])?(?:\(?\d{3}\)?[-.\s])\d{3}[-.\s]\d{4}\b/;
const YEAR_RE = /\b(?:19|20)\d{2}\b/g;
const LINKEDIN_RE = /linkedin\.com\/in\//i;

const RESUME_SECTIONS = new Set([
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "awards",
  "publications",
  "volunteer",
]);

const RESUME_ROLE =
  /\b(engineer|developer|designer|manager|intern|analyst|scientist|consultant|founder|director|researcher|architect|specialist|coordinator|officer|associate|software|full[-\s]?stack|frontend|backend|product|marketing|sales|operations)\b/i;

const NOT_RESUME =
  /\b(invoice|receipt|statement of account|amount due|balance due|tax invoice|purchase order|bill to|ship to|w-2|w2|1099|form 1040|lease agreement|non-disclosure|terms of service|table of contents|syllabus|lab report)\b/i;

const MIN_CHARS = 180;
const MAX_CHARS = 80_000;

function countMatches(text: string, pattern: RegExp) {
  return text.match(pattern)?.length ?? 0;
}

export function assertLooksLikeResume(resume: ParsedResume) {
  const text = resume.rawText.trim();

  if (text.length < MIN_CHARS) {
    throw new Error("That document is too short to be a résumé.");
  }
  if (text.length > MAX_CHARS) {
    throw new Error("That document is too long to be a résumé.");
  }

  const sectionHits = resume.sections.filter((section) => {
    const key = section.title.toLowerCase();
    return [...RESUME_SECTIONS].some((name) => key === name || key.includes(name));
  }).length;
  const hasContact = Boolean(
    resume.email ||
      resume.phone ||
      EMAIL_RE.test(text) ||
      PHONE_RE.test(text) ||
      LINKEDIN_RE.test(text) ||
      resume.links.length > 0,
  );
  const yearCount = countMatches(text, YEAR_RE);
  const hasRoleLanguage = RESUME_ROLE.test(text);
  const rejectHits = countMatches(text, NOT_RESUME);

  if (rejectHits >= 2 && sectionHits === 0) {
    throw new Error("That file does not look like a résumé.");
  }

  let score = 0;
  if (hasContact) {
    score += 2;
  }
  if (sectionHits >= 1) {
    score += 2;
  }
  if (sectionHits >= 2) {
    score += 1;
  }
  if (yearCount >= 2) {
    score += 1;
  }
  if (resume.name) {
    score += 1;
  }
  if (hasRoleLanguage) {
    score += 1;
  }

  if (score < 4) {
    throw new Error(
      "That file does not look like a résumé. Use a CV with your work history.",
    );
  }
}
