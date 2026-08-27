import {
  detectRole,
  detectSeniority,
  estimateYearsOfExperience,
  extractSkills,
  mergeCounts,
  type SkillCounts,
} from "@/lib/matching/extract";
import { SKILL_BY_ID, type RoleFamily } from "@/lib/matching/taxonomy";
import type { ParsedResume, ResumeSection } from "@/lib/resume/types";
import type { CandidateProfile, ProfileSkill } from "./types";

const SKILL_SECTION = /skill|technolog|tech stack|tooling|tools|expertise|competenc/i;
const EXPERIENCE_SECTION = /experience|employment|work history|career|professional/i;
const PROJECT_SECTION = /project|portfolio/i;

function sectionText(section: ResumeSection) {
  return section.blocks
    .map((block) => {
      if (block.type === "paragraph") {
        return block.text;
      }
      return block.items.join("\n");
    })
    .join("\n");
}

/**
 * Titles are the first line of each experience entry often enough that this is
 * a usable role signal, and it keeps role detection off unrelated prose.
 */
function experienceTitles(sections: ResumeSection[]) {
  const titles: string[] = [];
  for (const section of sections) {
    if (!EXPERIENCE_SECTION.test(section.title)) {
      continue;
    }
    for (const block of section.blocks) {
      if (block.type === "paragraph" && block.text.length < 120) {
        titles.push(block.text);
      }
    }
  }
  return titles;
}

export function deriveCandidateProfile(resume: ParsedResume): CandidateProfile {
  const skillSections: string[] = [];
  const proseSections: string[] = [];
  const experienceText: string[] = [];

  for (const section of resume.sections) {
    const text = sectionText(section);
    if (SKILL_SECTION.test(section.title)) {
      skillSections.push(text);
    } else {
      proseSections.push(`${section.title}\n${text}`);
    }
    if (EXPERIENCE_SECTION.test(section.title) || PROJECT_SECTION.test(section.title)) {
      experienceText.push(text);
    }
  }

  const structured = extractSkills(skillSections.join("\n"), true);
  const prose = extractSkills(
    [resume.headline ?? "", ...proseSections].join("\n"),
    false,
  );
  // Skills the candidate explicitly lists count double; they are a stronger
  // claim than an incidental mention in a bullet.
  const weighted: SkillCounts = new Map(structured);
  for (const [id, count] of structured) {
    weighted.set(id, count + 1);
  }
  const counts = mergeCounts(weighted, prose);

  const skills: ProfileSkill[] = [...counts.entries()]
    .map(([id, weight]) => {
      const skill = SKILL_BY_ID.get(id);
      return skill
        ? { id, label: skill.label, category: skill.category, weight }
        : null;
    })
    .filter((value): value is ProfileSkill => value !== null)
    .sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label));

  const primaryCutoff = Math.max(2, skills[0]?.weight ? Math.ceil(skills[0].weight / 2) : 2);
  const primarySkills = skills.filter((skill) => skill.weight >= primaryCutoff).slice(0, 10);
  const primaryIds = new Set(primarySkills.map((skill) => skill.id));
  const secondarySkills = skills.filter((skill) => !primaryIds.has(skill.id));

  const titles = experienceTitles(resume.sections);
  const roleSource = [resume.headline ?? "", ...titles].join(" \n ");
  const roles = rankRoles(roleSource, skills);

  const yearsOfExperience = estimateYearsOfExperience(
    experienceText.join("\n") || resume.rawText,
  );

  const seniority = detectSeniority(
    roleSource,
    yearsOfExperience !== null ? `${yearsOfExperience} years` : "",
  );

  return {
    name: resume.name,
    headline: resume.headline,
    location: resume.location,
    skills,
    primarySkills,
    secondarySkills,
    skillIds: new Set(skills.map((skill) => skill.id)),
    roles,
    seniority,
    yearsOfExperience,
    titles,
  };
}

const CATEGORY_TO_ROLE: Partial<Record<string, RoleFamily>> = {
  frontend: "frontend",
  backend: "backend",
  mobile: "mobile",
  data: "data",
  devops: "devops",
};

/**
 * Combine stated titles with the shape of the skill set, then collapse a strong
 * frontend + backend showing into full stack.
 */
function rankRoles(titleText: string, skills: ProfileSkill[]): RoleFamily[] {
  const scores = new Map<RoleFamily, number>();

  const titled = detectRole(titleText);
  if (titled !== "other") {
    scores.set(titled, 6);
  }

  for (const skill of skills) {
    const family = CATEGORY_TO_ROLE[skill.category];
    if (family) {
      scores.set(family, (scores.get(family) ?? 0) + skill.weight);
    }
    if (skill.id === "machine-learning" || skill.id === "llm" || skill.id === "pytorch") {
      scores.set("ml", (scores.get("ml") ?? 0) + skill.weight);
    }
  }

  const frontend = scores.get("frontend") ?? 0;
  const backend = scores.get("backend") ?? 0;
  if (frontend >= 2 && backend >= 2) {
    scores.set("fullstack", frontend + backend);
  }

  const ranked = [...scores.entries()]
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([family]) => family);

  return ranked.length > 0 ? ranked.slice(0, 3) : ["other"];
}
