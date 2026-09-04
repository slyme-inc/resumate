import { cacheLife } from "next/cache";

const FETCH_TIMEOUT_MS = 8_000;
const MAX_README_CHARS = 400_000;
const USER_AGENT = "resumate (open-source discovery)";

export type GithubRepoRef = {
  owner: string;
  name: string;
};

export type GithubReadme = {
  markdown: string;
  name: string;
  assetBase: string;
  blobBase: string;
  htmlUrl: string;
};

export function parseGithubRepo(fullName: string): GithubRepoRef | null {
  const cleaned = fullName
    .trim()
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/\/+$/, "");
  const [owner, name] = cleaned.split("/");
  if (!owner || !name || cleaned.split("/").length !== 2) {
    return null;
  }
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(name)) {
    return null;
  }
  return { owner, name };
}

export function githubOgImage(fullName: string) {
  const parsed = parseGithubRepo(fullName);
  if (!parsed) {
    return null;
  }
  return `https://opengraph.githubassets.com/1/${parsed.owner}/${parsed.name}`;
}

export function githubRepoUrl(fullName: string) {
  const parsed = parseGithubRepo(fullName);
  if (!parsed) {
    return null;
  }
  return `https://github.com/${parsed.owner}/${parsed.name}`;
}

function bases(repo: GithubRepoRef) {
  return {
    assetBase: `https://raw.githubusercontent.com/${repo.owner}/${repo.name}/HEAD/`,
    blobBase: `https://github.com/${repo.owner}/${repo.name}/blob/HEAD/`,
    htmlUrl: `https://github.com/${repo.owner}/${repo.name}`,
  };
}

function githubHeaders(accept: string) {
  const headers: Record<string, string> = {
    Accept: accept,
    "User-Agent": USER_AGENT,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function readLimited(response: Response) {
  const text = await response.text();
  if (text.length <= MAX_README_CHARS) {
    return text;
  }
  return `${text.slice(0, MAX_README_CHARS)}\n\n…[truncated]`;
}

async function fetchWithTimeout(url: string, headers: Record<string, string>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFromApi(repo: GithubRepoRef): Promise<GithubReadme | null> {
  const response = await fetchWithTimeout(
    `https://api.github.com/repos/${repo.owner}/${repo.name}/readme`,
    githubHeaders("application/vnd.github.raw+json"),
  );
  if (!response.ok) {
    return null;
  }
  const markdown = await readLimited(response);
  if (!markdown.trim()) {
    return null;
  }
  const disposition = response.headers.get("content-disposition") ?? "";
  const named = disposition.match(/filename\*?=(?:UTF-8''|"?)([^";]+)/i)?.[1];
  return {
    markdown,
    name: named ? decodeURIComponent(named) : "README.md",
    ...bases(repo),
  };
}

const RAW_CANDIDATES = ["README.md", "readme.md", "README", "README.rst", "docs/README.md"];

async function fetchFromRaw(repo: GithubRepoRef): Promise<GithubReadme | null> {
  for (const name of RAW_CANDIDATES) {
    const response = await fetchWithTimeout(
      `https://raw.githubusercontent.com/${repo.owner}/${repo.name}/HEAD/${name}`,
      { "User-Agent": USER_AGENT, Accept: "text/plain,*/*" },
    );
    if (!response.ok) {
      continue;
    }
    const markdown = await readLimited(response);
    if (!markdown.trim()) {
      continue;
    }
    return { markdown, name, ...bases(repo) };
  }
  return null;
}

export async function getGithubReadme(fullName: string): Promise<GithubReadme | null> {
  "use cache";

  const repo = parseGithubRepo(fullName);
  if (!repo) {
    cacheLife("days");
    return null;
  }

  try {
    const readme = (await fetchFromApi(repo)) ?? (await fetchFromRaw(repo));
    if (readme) {
      cacheLife("days");
    } else {
      cacheLife("hours");
    }
    return readme;
  } catch {
    cacheLife("hours");
    return null;
  }
}

function headingLevel(line: string) {
  const match = line.match(/^(#{1,6})\s+/);
  return match ? match[1].length : 0;
}

export function sectionByHeading(markdown: string, pattern: RegExp) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => headingLevel(line) > 0 && pattern.test(line));
  if (start < 0) {
    return "";
  }
  const level = headingLevel(lines[start] ?? "");
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const next = headingLevel(lines[index] ?? "");
    if (next > 0 && next <= level) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join("\n").trim();
}

export function readmeExcerpt(markdown: string, max = 8_000) {
  const intro = markdown.slice(0, 3_500);
  const contributing = sectionByHeading(
    markdown,
    /contribut|getting started|development|setup|local|install/i,
  );
  const extra =
    contributing && !intro.includes(contributing.slice(0, 80))
      ? contributing.slice(0, 4_500)
      : "";
  const text = `${intro}\n\n${extra}`.trim();
  return text.length > max ? `${text.slice(0, max).trim()}\n…[truncated]` : text;
}

export function setupCommands(markdown: string) {
  const blocks = [...markdown.matchAll(/```(?:bash|sh|shell|zsh)?\n([\s\S]*?)```/gi)];
  const commands: string[] = [];
  const seen = new Set<string>();
  for (const block of blocks) {
    for (const raw of (block[1] ?? "").split("\n")) {
      const line = raw.replace(/^\$\s*/, "").trim();
      if (
        !line ||
        line.startsWith("#") ||
        !/^(git clone|cd |npm |pnpm |yarn |bun |pip |poetry |uv |cargo |go |make |composer )/i.test(
          line,
        )
      ) {
        continue;
      }
      const key = line.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      commands.push(line);
      if (commands.length === 5) {
        return commands;
      }
    }
  }
  return commands;
}
