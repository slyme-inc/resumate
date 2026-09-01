import type { StartupNewsItem } from "@/lib/db/startups";

const ROUND_LABELS: Record<string, string> = {
  pre_seed: "pre-seed",
  seed: "seed",
  pre_series_a: "pre-Series A",
  series_a: "Series A",
  undisclosed: "undisclosed",
};

const SOURCE_LABELS: Record<string, string> = {
  yc: "Y Combinator",
  seedlist: "Seedlist",
  yourstory: "YourStory",
  inc42: "Inc42",
  techcrunch: "TechCrunch",
};

export function sourceLabel(source: string) {
  return SOURCE_LABELS[source] ?? source;
}

export function newsHeadline(item: StartupNewsItem) {
  if (item.kind === "yc") {
    return item.ycBatch
      ? `${item.company} joined Y Combinator ${item.ycBatch}`
      : `${item.company} joined Y Combinator`;
  }

  const round = item.round ? (ROUND_LABELS[item.round] ?? item.round.replaceAll("_", " ")) : null;
  if (item.amount && round && round !== "undisclosed") {
    return `${item.company} raised ${item.amount} ${round}`;
  }
  if (item.amount) {
    return `${item.company} raised ${item.amount}`;
  }
  if (round) {
    return `${item.company} announced a ${round} round`;
  }
  return `${item.company} announced funding`;
}

export function newsDateLabel(date: Date | null) {
  if (!date) {
    return null;
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function newsMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function industryTags(industry: string | null) {
  if (!industry?.trim()) {
    return [];
  }
  return industry
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0 && tag.toLowerCase() !== "unspecified")
    .slice(0, 5);
}

export function groupNewsByBatch(items: StartupNewsItem[]) {
  const groups: { key: string; label: string; items: StartupNewsItem[] }[] = [];

  for (const item of items) {
    const key = item.ycBatch ?? "unknown";
    const label = item.ycBatch ?? "Batch not listed";
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
    } else {
      groups.push({ key, label, items: [item] });
    }
  }

  return groups;
}

export function groupNewsByMonth(items: StartupNewsItem[]) {
  const groups: { key: string; label: string; items: StartupNewsItem[] }[] = [];

  for (const item of items) {
    const key = item.announcedAt
      ? `${item.announcedAt.getUTCFullYear()}-${String(item.announcedAt.getUTCMonth() + 1).padStart(2, "0")}`
      : "unknown";
    const label = item.announcedAt ? newsMonthLabel(item.announcedAt) : "Date not listed";
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
    } else {
      groups.push({ key, label, items: [item] });
    }
  }

  return groups;
}

export function sourceUrlLabel(source: string) {
  return source === "yc" ? "YC profile" : "Source";
}
