export type ResumeBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "tags"; items: string[] };

export type ResumeSection = {
  title: string;
  blocks: ResumeBlock[];
};

export type ParsedResume = {
  fileName: string;
  rawText: string;
  name: string | null;
  headline: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  links: string[];
  sections: ResumeSection[];
};
