export type ResumeBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "tags"; items: string[] };

export type ResumeSection = {
  title: string;
  blocks: ResumeBlock[];
};

export type ResumeLink = {
  label: string;
  url: string;
};

/** Visual replacements keyed to original document line text. */
export type ResumeOverlay = {
  from: string;
  to: string;
};

export type ParsedResume = {
  fileName: string;
  rawText: string;
  name: string | null;
  headline: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  links: ResumeLink[];
  sections: ResumeSection[];
  overlays?: ResumeOverlay[];
};
