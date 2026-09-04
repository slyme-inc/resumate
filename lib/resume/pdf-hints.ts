import type { ApplyHintsResult, HintRect, ResumeHintAnchor } from "@/lib/resume/docx-hints";
import type { PdfTextRun } from "@/lib/resume/pdf-runs";

function fold(text: string) {
  return text
    .normalize("NFKC")
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/[\u00A0\u202F\u2007]/g, " ")
    .replace(/[•·∙●]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function scoreText(needle: string, haystack: string) {
  const a = fold(needle);
  const b = fold(haystack);
  if (!a || !b) {
    return 0;
  }
  if (a === b) {
    return 1;
  }
  if (b.includes(a) || a.includes(b)) {
    return Math.min(a.length, b.length) / Math.max(a.length, b.length);
  }
  const aTokens = a.split(" ").filter((token) => token.length > 2);
  const bSet = new Set(b.split(" ").filter((token) => token.length > 2));
  if (aTokens.length === 0 || bSet.size === 0) {
    return 0;
  }
  const overlap = aTokens.filter((token) => bSet.has(token)).length;
  return overlap / Math.max(aTokens.length, bSet.size);
}

function hintKey(index: number, current: string) {
  return `${index}:${current.slice(0, 48)}`;
}

function seedAnchors(
  hints: Array<{ current: string; suggested: string; reason: string }>,
): ResumeHintAnchor[] {
  return hints
    .filter((hint) => hint.current.trim() && fold(hint.current) !== fold(hint.suggested))
    .map((hint, index) => ({
      key: hintKey(index, hint.current),
      current: hint.current,
      suggested: hint.suggested,
      reason: hint.reason,
      changeIds: [],
      target: null,
      ref: null,
      nodeId: null,
    }));
}

function bestRun(runs: PdfTextRun[], needle: string, used: Set<string>) {
  let best: (PdfTextRun & { score: number }) | null = null;
  for (const run of runs) {
    if (used.has(run.id) || !run.text.trim()) {
      continue;
    }
    const score = scoreText(needle, run.text);
    if (score >= 0.32 && (!best || score > best.score)) {
      best = { ...run, score };
    }
  }
  if (best) {
    return best;
  }

  for (let index = 0; index < runs.length - 1; index += 1) {
    const left = runs[index];
    const right = runs[index + 1];
    if (left.pageIndex !== right.pageIndex || used.has(left.id)) {
      continue;
    }
    const joined = `${left.text} ${right.text}`;
    const score = scoreText(needle, joined);
    if (score >= 0.32 && (!best || score > best.score)) {
      best = { ...left, text: joined, score };
    }
  }
  return best;
}

export function applyPdfHints(
  runs: PdfTextRun[],
  hints: Array<{ current: string; suggested: string; reason: string }>,
  signal?: AbortSignal,
): ApplyHintsResult {
  const seeded = seedAnchors(hints);
  if (signal?.aborted) {
    return { pending: [], missed: seeded.length, aborted: true };
  }

  const used = new Set<string>();
  const pending: ResumeHintAnchor[] = [];
  let missed = 0;

  for (const anchor of seeded) {
    if (signal?.aborted) {
      return { pending: [], missed: seeded.length, aborted: true };
    }
    const run = bestRun(runs, anchor.current, used);
    if (!run) {
      missed += 1;
      continue;
    }
    used.add(run.id);
    pending.push({
      ...anchor,
      target: run.id,
      ref: run.id,
      nodeId: run.id,
    });
  }

  return { pending, missed };
}

export function acceptPdfHint(runs: PdfTextRun[], anchor: ResumeHintAnchor): PdfTextRun[] | null {
  const id = typeof anchor.nodeId === "string" ? anchor.nodeId : null;
  if (!id) {
    return null;
  }
  let found = false;
  const next = runs.map((run) => {
    if (run.id !== id) {
      return run;
    }
    found = true;
    return { ...run, text: anchor.suggested };
  });
  return found ? next : null;
}

export function getPdfHintRect(
  root: HTMLElement,
  anchor: ResumeHintAnchor,
  relativeTo: HTMLElement,
): HintRect | null {
  const id = typeof anchor.nodeId === "string" ? anchor.nodeId : null;
  if (!id) {
    return null;
  }
  const node = root.querySelector<HTMLElement>(`[data-pdf-run="${CSS.escape(id)}"]`);
  if (!node) {
    return null;
  }
  const target = node.querySelector<HTMLElement>("[data-pdf-hint-new]") ?? node;
  const box = target.getBoundingClientRect();
  const origin = relativeTo.getBoundingClientRect();
  return {
    top: box.top - origin.top,
    left: box.left - origin.left,
    width: box.width,
    height: box.height,
  };
}

export function getPdfHintRects(
  root: HTMLElement,
  pending: ResumeHintAnchor[],
  relativeTo: HTMLElement,
): Record<string, HintRect> {
  const result: Record<string, HintRect> = {};
  for (const anchor of pending) {
    const rect = getPdfHintRect(root, anchor, relativeTo);
    if (rect) {
      result[anchor.key] = rect;
    }
  }
  return result;
}
