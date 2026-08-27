const DAY = 24 * 60 * 60 * 1000;

export type Freshness = {
  label: string;
  /** Spec §31: flag listings old enough that they may no longer be open. */
  stale: boolean;
};

export function freshness(date: Date | null): Freshness | null {
  if (!date) {
    return null;
  }

  const days = Math.floor((Date.now() - date.getTime()) / DAY);
  if (days < 0) {
    return { label: "Just posted", stale: false };
  }
  if (days === 0) {
    return { label: "Posted today", stale: false };
  }
  if (days === 1) {
    return { label: "Posted yesterday", stale: false };
  }
  if (days < 7) {
    return { label: `Posted ${days} days ago`, stale: false };
  }
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return { label: `Posted ${weeks} week${weeks > 1 ? "s" : ""} ago`, stale: false };
  }
  if (days < 60) {
    return { label: "Posted over a month ago", stale: false };
  }

  const months = Math.floor(days / 30);
  return { label: `Posted ${months} months ago`, stale: true };
}

export function formatSalary(min: number | null, max: number | null) {
  if (min === null && max === null) {
    return null;
  }

  const format = (value: number) =>
    value >= 1000 ? `${Math.round(value / 1000)}k` : `${value}`;

  if (min !== null && max !== null) {
    return min === max ? format(min) : `${format(min)} – ${format(max)}`;
  }
  return min !== null ? `From ${format(min)}` : `Up to ${format(max as number)}`;
}

/** Location values are free text and can list a dozen countries. */
export function shortLocation(location: string | null, maxParts = 2) {
  if (!location) {
    return null;
  }
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= maxParts) {
    return parts.join(", ") || location.trim();
  }
  return `${parts.slice(0, maxParts).join(", ")} +${parts.length - maxParts} more`;
}
