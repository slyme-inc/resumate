const DAY = 24 * 60 * 60 * 1000;

export function formatStars(stars: number | null) {
  if (stars === null) {
    return null;
  }
  if (stars < 1000) {
    return String(stars);
  }
  const thousands = stars / 1000;
  const digits = thousands < 10 ? 1 : thousands < 100 ? 1 : 0;
  return `${thousands.toFixed(digits).replace(/\.0$/, "")}k`;
}

export function pushedLabel(date: Date | null) {
  if (!date) {
    return null;
  }

  const days = Math.floor((Date.now() - date.getTime()) / DAY);
  if (days < 0) {
    return "Pushed today";
  }
  if (days === 0) {
    return "Pushed today";
  }
  if (days === 1) {
    return "Pushed yesterday";
  }
  if (days < 7) {
    return `Pushed ${days} days ago`;
  }
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `Pushed ${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function repoTitle(fullName: string) {
  const slash = fullName.lastIndexOf("/");
  return slash >= 0 ? fullName.slice(slash + 1) : fullName;
}

export function ycCompanyUrl(ycSlug: string) {
  return `https://www.ycombinator.com/companies/${encodeURIComponent(ycSlug)}`;
}

export function ossRepoPath(id: string) {
  return `/open-source/${encodeURIComponent(id)}`;
}

export function isRecentPush(date: Date | null, withinDays = 14) {
  if (!date) {
    return false;
  }
  return Date.now() - date.getTime() < withinDays * DAY;
}
