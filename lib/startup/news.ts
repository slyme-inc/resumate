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

export function isFreshNews(date: Date | null, withinDays = 14) {
  if (!date) {
    return false;
  }
  return Date.now() - date.getTime() < withinDays * 24 * 60 * 60 * 1000;
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
