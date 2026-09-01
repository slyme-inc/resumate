import type { SuperDocInstance } from "@superdoc-dev/react";

export type ResumeHintAnchor = {
  key: string;
  current: string;
  suggested: string;
  reason: string;
  changeIds: string[];
  target: unknown | null;
  ref: string | null;
  nodeId: string | null;
};

type ListedBlock = {
  ref: string | null;
  nodeId: string | null;
  text: string;
};

export type ApplyHintsResult = {
  pending: ResumeHintAnchor[];
  missed: number;
  aborted?: boolean;
};

export type HintRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type SuperDocHost = SuperDocInstance;
type EditorDoc = NonNullable<NonNullable<SuperDocHost["activeEditor"]>["doc"]>;
type ReplaceFn = (
  input: { ref?: string; target?: unknown; text: string },
  options?: { changeMode?: "direct" | "tracked"; expectedRevision?: string },
) => unknown;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

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

function getDoc(superdoc: SuperDocHost): EditorDoc | null {
  return superdoc.activeEditor?.doc ?? null;
}

function docReplace(doc: EditorDoc): ReplaceFn | null {
  if (typeof doc.replace === "function") {
    return doc.replace.bind(doc) as ReplaceFn;
  }
  const nested = (doc as EditorDoc & { text?: { replace?: ReplaceFn } }).text?.replace;
  return typeof nested === "function" ? nested : null;
}

function asItems(value: unknown): Record<string, unknown>[] {
  const record = asRecord(value);
  const nested = asRecord(record?.value);
  const bags = [record?.items, nested?.items];
  for (const bag of bags) {
    if (Array.isArray(bag) && bag.length > 0) {
      return bag.map(asRecord).filter((item): item is Record<string, unknown> => item !== null);
    }
  }
  if (Array.isArray(value)) {
    return value.map(asRecord).filter((item): item is Record<string, unknown> => item !== null);
  }
  return [];
}

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = window.setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function aborted(signal?: AbortSignal) {
  return Boolean(signal?.aborted);
}

async function safely<T>(run: () => Promise<T> | T, fallback: T): Promise<T> {
  try {
    return await run();
  } catch {
    return fallback;
  }
}

function isOk(value: unknown) {
  if (value === true) {
    return true;
  }
  if (value === false || value == null) {
    return false;
  }
  const record = asRecord(value);
  if (!record) {
    return false;
  }
  if (record.ok === false || record.success === false) {
    return false;
  }
  return record.ok === true || record.success === true || !("ok" in record || "success" in record);
}

async function listBlocks(doc: EditorDoc) {
  const list = doc.blocks?.list;
  if (!list) {
    return [];
  }
  return safely(async () => {
    const result = asRecord(await list({ includeText: true, limit: 400 }));
    const blocks = result?.blocks;
    if (!Array.isArray(blocks)) {
      return [];
    }
    return blocks
      .map(asRecord)
      .filter((block): block is Record<string, unknown> => block !== null)
      .map((block) => ({
        ref: typeof block.ref === "string" ? block.ref : null,
        nodeId: typeof block.nodeId === "string" ? block.nodeId : null,
        text: String(block.text ?? block.textPreview ?? ""),
      }))
      .filter((block) => fold(block.text).length >= 4);
  }, []);
}

async function waitForDoc(superdoc: SuperDocHost, signal?: AbortSignal) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (aborted(signal)) {
      return { doc: null, blocks: [] as ListedBlock[] };
    }
    const doc = getDoc(superdoc);
    if (doc) {
      const blocks = await listBlocks(doc);
      if (blocks.length > 0) {
        return { doc, blocks };
      }
    }
    await delay(150, signal);
  }
  const doc = getDoc(superdoc);
  return { doc, blocks: doc ? await listBlocks(doc) : [] };
}

async function listChangeIds(superdoc: SuperDocHost) {
  const ids = new Set<string>();
  const doc = getDoc(superdoc);
  if (doc?.trackChanges?.list) {
    const listed = await safely(() => doc.trackChanges.list!({ limit: 200 }), null);
    for (const item of asItems(listed)) {
      if (typeof item.id === "string") {
        ids.add(item.id);
      }
    }
  }
  for (const item of superdoc.ui?.trackChanges?.list?.() ?? []) {
    const record = asRecord(item);
    if (typeof record?.id === "string") {
      ids.add(record.id);
    }
  }
  return ids;
}

async function createdChangeIds(superdoc: SuperDocHost, before: Set<string>, signal?: AbortSignal) {
  await delay(120, signal);
  const after = await listChangeIds(superdoc);
  return [...after].filter((id) => !before.has(id));
}

function overlappingSlice(haystack: string, needle: string) {
  const foldedHay = fold(haystack);
  const foldedNeedle = fold(needle);
  if (!foldedNeedle || foldedHay === foldedNeedle || foldedNeedle.includes(foldedHay)) {
    return haystack;
  }
  const idx = haystack.toLowerCase().indexOf(needle.trim().toLowerCase());
  if (idx >= 0) {
    return haystack.slice(idx, idx + needle.trim().length);
  }
  return haystack;
}

function selectionTarget(nodeId: string, length: number) {
  return {
    kind: "selection" as const,
    start: { kind: "text" as const, blockId: nodeId, offset: 0 },
    end: { kind: "text" as const, blockId: nodeId, offset: Math.max(1, length) },
  };
}

async function matchText(doc: EditorDoc, pattern: string) {
  const match = doc.query?.match;
  if (typeof match !== "function" || !pattern.trim()) {
    return null;
  }
  const result = asRecord(
    await safely(
      () =>
        match({
          select: { type: "text", pattern, caseSensitive: false },
          require: "first",
          limit: 1,
        }),
      null,
    ),
  );
  if (!result) {
    return null;
  }
  const item = asItems(result)[0] ?? null;
  const handle = asRecord(item?.handle);
  const target = item?.target ?? null;
  const ref = typeof handle?.ref === "string" ? handle.ref : null;
  if (!target && !ref) {
    return null;
  }
  return {
    target,
    ref,
    evaluatedRevision:
      typeof result.evaluatedRevision === "string" ? result.evaluatedRevision : undefined,
  };
}

async function trackedReplace(
  superdoc: SuperDocHost,
  findText: string,
  replacement: string,
  block: ListedBlock,
) {
  const doc = getDoc(superdoc);
  if (!doc) {
    return false;
  }
  const replace = docReplace(doc);
  const matched = await matchText(doc, findText);

  async function attempt(input: { ref?: string; target?: unknown; text: string }, revision?: string) {
    if (!replace) {
      return false;
    }
    const receipt = asRecord(
      await safely(
        () => replace(input, { changeMode: "tracked", expectedRevision: revision }),
        { success: false },
      ),
    );
    return Boolean(receipt) && receipt?.success !== false && receipt?.ok !== false;
  }

  if (matched?.target && (await attempt({ target: matched.target, text: replacement }, matched.evaluatedRevision))) {
    return true;
  }
  if (matched?.ref && (await attempt({ ref: matched.ref, text: replacement }, matched.evaluatedRevision))) {
    return true;
  }
  if (block.ref && (await attempt({ ref: block.ref, text: replacement }))) {
    return true;
  }
  if (
    block.nodeId &&
    (await attempt({
      target: selectionTarget(block.nodeId, findText.length),
      text: replacement,
    }))
  ) {
    return true;
  }

  const authoring = superdoc.activeEditor?.authoring;
  if (authoring?.replaceTextByText) {
    const result = asRecord(
      await safely(
        () =>
          authoring.replaceTextByText!({
            findText,
            replacement,
            occurrence: 0,
            mode: "tracked",
          }),
        { ok: false } as never,
      ),
    );
    if (result?.ok === true) {
      return true;
    }
  }
  return false;
}

function hintKey(index: number, current: string) {
  return `${index}:${current.slice(0, 48)}`;
}

function textTarget(block: ListedBlock): unknown | null {
  if (!block.nodeId) {
    return null;
  }
  return {
    kind: "text",
    segments: [
      {
        blockId: block.nodeId,
        range: { start: 0, end: Math.max(1, block.text.length) },
      },
    ],
  };
}

export function seedResumeHintAnchors(
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

function bestBlock(blocks: ListedBlock[], needle: string, used: Set<string>) {
  let best: (ListedBlock & { score: number }) | null = null;
  for (const block of blocks) {
    const key = fold(block.text);
    if (used.has(key)) {
      continue;
    }
    const score = scoreText(needle, block.text);
    if (score >= 0.32 && (!best || score > best.score)) {
      best = { ...block, score };
    }
  }
  return best;
}

export async function applyResumeHints(
  superdoc: SuperDocHost,
  hints: Array<{ current: string; suggested: string; reason: string }>,
  signal?: AbortSignal,
): Promise<ApplyHintsResult> {
  const seeded = seedResumeHintAnchors(hints);
  try {
    const ready = await waitForDoc(superdoc, signal);
    if (aborted(signal)) {
      return { pending: [], missed: seeded.length, aborted: true };
    }
    if (!ready.doc) {
      return { pending: [], missed: seeded.length };
    }

    await delay(200, signal);

    const used = new Set<string>();
    const pending: ResumeHintAnchor[] = [];
    let missed = 0;

    for (const anchor of seeded) {
      if (aborted(signal)) {
        return { pending: [], missed: seeded.length, aborted: true };
      }
      const blocks = await listBlocks(ready.doc);
      const block = bestBlock(blocks, anchor.current, used);
      if (!block) {
        missed += 1;
        continue;
      }
      used.add(fold(block.text));
      const findText = overlappingSlice(block.text, anchor.current);
      const before = await listChangeIds(superdoc);
      const replaced = await trackedReplace(superdoc, findText, anchor.suggested, block);
      await delay(220, signal);
      if (!replaced) {
        missed += 1;
        continue;
      }
      used.add(fold(anchor.suggested));
      const changeIds = await createdChangeIds(superdoc, before, signal);
      pending.push({
        ...anchor,
        current: findText,
        changeIds,
        target: block.nodeId ? selectionTarget(block.nodeId, findText.length) : textTarget(block),
        ref: block.ref,
        nodeId: block.nodeId,
      });
    }

    const assigned = new Set(pending.flatMap((item) => item.changeIds));
    const leftoverIds = [...(await listChangeIds(superdoc))].filter((id) => !assigned.has(id));
    for (const item of pending) {
      if (item.changeIds.length === 0 && leftoverIds.length > 0) {
        item.changeIds.push(leftoverIds.shift()!);
      }
    }

    return { pending, missed };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { pending: [], missed: seeded.length, aborted: true };
    }
    throw error;
  }
}

function decisionOk(result: unknown) {
  if (result === true) {
    return true;
  }
  if (result === false) {
    return false;
  }
  return isOk(result);
}

async function replaceDirect(
  superdoc: SuperDocHost,
  findText: string,
  replacement: string,
  ref: string | null,
  nodeId: string | null,
) {
  const doc = getDoc(superdoc);
  const replace = doc ? docReplace(doc) : null;

  async function attempt(input: { ref?: string; target?: unknown; text: string }) {
    if (!replace) {
      return false;
    }
    const receipt = asRecord(
      await safely(() => replace(input, { changeMode: "direct" }), { success: false }),
    );
    return Boolean(receipt) && receipt?.success !== false && receipt?.ok !== false;
  }

  if (ref && (await attempt({ ref, text: replacement }))) {
    return true;
  }
  if (
    nodeId &&
    (await attempt({
      target: selectionTarget(nodeId, findText.length),
      text: replacement,
    }))
  ) {
    return true;
  }

  const matched = doc ? await matchText(doc, findText) : null;
  if (matched?.target && (await attempt({ target: matched.target, text: replacement }))) {
    return true;
  }

  const authoring = superdoc.activeEditor?.authoring;
  if (authoring?.replaceTextByText) {
    const result = asRecord(
      await safely(
        () =>
          authoring.replaceTextByText!({
            findText,
            replacement,
            occurrence: 0,
            mode: "direct",
          }),
        { ok: false } as never,
      ),
    );
    if (result?.ok === true) {
      return true;
    }
  }

  const search = superdoc.ui?.search;
  if (search) {
    const snap = await safely(() => {
      search.open();
      return search.find(findText);
    }, null);
    if (snap && snap.total > 0) {
      const result = await safely(() => search.replace(replacement), { ok: false });
      await safely(() => search.close(), undefined);
      if (decisionOk(result)) {
        return true;
      }
    } else {
      await safely(() => search.close(), undefined);
    }
  }
  return false;
}

export async function acceptResumeHint(superdoc: SuperDocHost, anchor: ResumeHintAnchor) {
  if (anchor.changeIds.length > 0) {
    const track = superdoc.ui?.trackChanges;
    if (track) {
      for (const id of anchor.changeIds) {
        const result = await safely(() => track.accept(id), false);
        if (!decisionOk(result)) {
          const decided = await decideOnDoc(superdoc, "accept", [id]);
          if (!decided) {
            return false;
          }
        }
      }
      return true;
    }
    return decideOnDoc(superdoc, "accept", anchor.changeIds);
  }

  return replaceDirect(superdoc, anchor.current, anchor.suggested, anchor.ref, anchor.nodeId);
}

export async function rejectResumeHint(superdoc: SuperDocHost, anchor: ResumeHintAnchor) {
  if (anchor.changeIds.length === 0) {
    return true;
  }
  const track = superdoc.ui?.trackChanges;
  if (track) {
    for (const id of anchor.changeIds) {
      const result = await safely(() => track.reject(id), false);
      if (!decisionOk(result)) {
        const decided = await decideOnDoc(superdoc, "reject", [id]);
        if (!decided) {
          return false;
        }
      }
    }
    return true;
  }
  return decideOnDoc(superdoc, "reject", anchor.changeIds);
}

async function decideOnDoc(
  superdoc: SuperDocHost,
  decision: "accept" | "reject",
  ids: string[],
) {
  const decide = getDoc(superdoc)?.trackChanges?.decide;
  if (!decide || ids.length === 0) {
    return false;
  }
  const result = asRecord(
    await safely(
      () =>
        decide({
          decision,
          target: ids.length === 1 ? { kind: "id", id: ids[0] } : { kind: "ids", ids },
        }),
      { success: false } as never,
    ),
  );
  return decisionOk(result);
}

export function getHintRect(
  superdoc: SuperDocHost,
  anchor: ResumeHintAnchor,
  relativeTo: HTMLElement,
): HintRect | null {
  return getHintRects(superdoc, [anchor], relativeTo)[anchor.key] ?? null;
}

function unionBox(
  a: { top: number; left: number; right: number; bottom: number },
  b: { top: number; left: number; right: number; bottom: number },
) {
  return {
    top: Math.min(a.top, b.top),
    left: Math.min(a.left, b.left),
    right: Math.max(a.right, b.right),
    bottom: Math.max(a.bottom, b.bottom),
  };
}

function trackedChangeBoxes(scope: HTMLElement) {
  const groups = new Map<string, { top: number; left: number; right: number; bottom: number }>();
  for (const node of scope.querySelectorAll("[data-track-change-id]")) {
    if (!(node instanceof HTMLElement)) {
      continue;
    }
    const id = node.getAttribute("data-track-change-id");
    if (!id) {
      continue;
    }
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0 && rect.height <= 0) {
      continue;
    }
    const box = { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom };
    const prev = groups.get(id);
    groups.set(id, prev ? unionBox(prev, box) : box);
  }
  return groups;
}

function apiHintRect(
  superdoc: SuperDocHost,
  anchor: ResumeHintAnchor,
  relativeTo: HTMLElement,
): HintRect | null {
  const getRect = superdoc.ui?.viewport?.getRect;
  if (!getRect) {
    return null;
  }
  const targets: unknown[] = [];
  for (const id of anchor.changeIds) {
    targets.push({ kind: "entity", entityType: "trackedChange", entityId: id });
  }
  if (anchor.target) {
    targets.push(anchor.target);
  }
  if (anchor.nodeId) {
    targets.push({
      kind: "text",
      segments: [{ blockId: anchor.nodeId, range: { start: 0, end: Math.max(1, anchor.current.length) } }],
    });
    targets.push({ kind: "block", nodeType: "paragraph", nodeId: anchor.nodeId });
  }
  try {
    for (const target of targets) {
      const result = asRecord(getRect({ target: target as never, relativeTo }));
      const rect = asRecord(result?.rect) ?? asRecord((result?.rects as unknown[])?.[0]);
      if (!rect || result?.found === false) {
        continue;
      }
      const top = Number(rect.top);
      const left = Number(rect.left);
      const width = Number(rect.width);
      const height = Number(rect.height);
      if (![top, left, width, height].every(Number.isFinite)) {
        continue;
      }
      return { top, left, width, height };
    }
  } catch {
    return null;
  }
  return null;
}

export function getHintRects(
  superdoc: SuperDocHost,
  pending: ResumeHintAnchor[],
  relativeTo: HTMLElement,
): Record<string, HintRect> {
  const origin = relativeTo.getBoundingClientRect();
  const scope = relativeTo.parentElement ?? relativeTo;
  const groups = trackedChangeBoxes(scope);
  const usedIds = new Set<string>();
  const next: Record<string, HintRect> = {};

  function toHint(box: { top: number; left: number; right: number; bottom: number }): HintRect {
    return {
      top: box.top - origin.top,
      left: box.left - origin.left,
      width: Math.max(1, box.right - box.left),
      height: Math.max(1, box.bottom - box.top),
    };
  }

  for (const anchor of pending) {
    let box: { top: number; left: number; right: number; bottom: number } | null = null;
    for (const id of anchor.changeIds) {
      const group = groups.get(id);
      if (!group) {
        continue;
      }
      usedIds.add(id);
      box = box ? unionBox(box, group) : { ...group };
    }
    if (box) {
      next[anchor.key] = toHint(box);
    }
  }

  const leftover = [...groups.entries()]
    .filter(([id]) => !usedIds.has(id))
    .sort((a, b) => a[1].top - b[1].top || a[1].left - b[1].left);

  for (const anchor of pending) {
    if (next[anchor.key] || leftover.length === 0) {
      continue;
    }
    const [, group] = leftover.shift()!;
    next[anchor.key] = toHint(group);
  }

  for (const anchor of pending) {
    if (next[anchor.key]) {
      continue;
    }
    const fallback = apiHintRect(superdoc, anchor, relativeTo);
    if (fallback) {
      next[anchor.key] = fallback;
    }
  }

  return next;
}

export function observeHintViewport(
  superdoc: SuperDocHost,
  listener: () => void,
  root?: HTMLElement | null,
) {
  const stops: Array<() => void> = [];
  try {
    const observe = superdoc.ui?.viewport?.observe;
    if (observe) {
      stops.push(
        observe(() => {
          try {
            listener();
          } catch {
            /* SuperDoc can tear the worker down mid-scroll. */
          }
        }),
      );
    }
  } catch {
    /* ignore */
  }

  const scroller = root?.querySelector(".superdoc-editor-container") ?? root;
  if (scroller) {
    scroller.addEventListener("scroll", listener, { passive: true });
    stops.push(() => scroller.removeEventListener("scroll", listener));
  }
  window.addEventListener("resize", listener);
  window.addEventListener("scroll", listener, true);
  stops.push(() => window.removeEventListener("resize", listener));
  stops.push(() => window.removeEventListener("scroll", listener, true));

  if (root) {
    const mutation = new MutationObserver(listener);
    mutation.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-track-change-id", "class", "style"],
    });
    stops.push(() => mutation.disconnect());
  }

  return () => {
    for (const stop of stops) {
      stop();
    }
  };
}

export async function scrollToHint(superdoc: SuperDocHost, anchor: ResumeHintAnchor) {
  const id = anchor.changeIds[0];
  if (id) {
    await safely(() => superdoc.ui?.trackChanges?.scrollTo?.(id), undefined);
    return;
  }
  if (anchor.target) {
    await safely(
      () => superdoc.ui?.viewport?.scrollIntoView?.({ target: anchor.target as never }),
      undefined,
    );
    return;
  }
  if (anchor.nodeId) {
    await safely(
      () =>
        superdoc.ui?.viewport?.scrollIntoView?.({
          target: {
            kind: "text",
            segments: [{ blockId: anchor.nodeId, range: { start: 0, end: 1 } }],
          } as never,
        }),
      undefined,
    );
  }
}
