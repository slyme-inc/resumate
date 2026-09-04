"use client";

import { ResumeDocument } from "@/app/home/resume-document";
import type {
  DocxEditorApi,
  HintRect,
  ResumeHintAnchor,
} from "@/app/home/docx-editor";
import type { OpportunityInsight } from "@/lib/ai/types";
import { asResumeFileName, isPdfContentType } from "@/lib/resume/file-type";
import {
  attachSuggestions,
  flattenResume,
  mergeSuggestions,
  skillReorderSuggestions,
  unmatchedRewrites,
} from "@/lib/resume/lines";
import type { ParsedResume } from "@/lib/resume/types";
import { Check, DownloadSimple, FilePdf, X } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";

export function ResumeTailor({
  resume,
  insight,
  loading,
  company,
  focusSkills = [],
  fileSrc,
  contentType,
}: {
  resume: ParsedResume;
  insight: OpportunityInsight | null;
  loading: boolean;
  company: string;
  focusSkills?: string[];
  fileSrc: string | null;
  contentType: string | null;
}) {
  const editorApi = useRef<DocxEditorApi | null>(null);
  const [busy, setBusy] = useState<"docx" | "pdf" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [pending, setPending] = useState<ResumeHintAnchor[]>([]);
  const lines = useMemo(() => flattenResume(resume), [resume]);
  const suggested = useMemo(() => {
    const fromModel = attachSuggestions(
      lines,
      insight?.resumeFit.improve ?? [],
    );
    return mergeSuggestions(
      fromModel,
      skillReorderSuggestions(lines, focusSkills),
    );
  }, [lines, insight, focusSkills]);
  const leftover = useMemo(
    () => unmatchedRewrites(insight?.resumeFit.improve ?? [], suggested),
    [insight, suggested],
  );
  const hints = useMemo(() => {
    const attached = [...suggested.entries()].map(([id, rewrite]) => {
      const line = lines.find((item) => item.id === id);
      return {
        current: line?.text || rewrite.current,
        suggested: rewrite.suggested,
        reason: rewrite.reason,
      };
    });
    return [...attached, ...leftover];
  }, [lines, suggested, leftover]);
  const hintKey = hints
    .map((hint) => `${hint.current}=>${hint.suggested}`)
    .join("\n");
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    setSynced(false);
  }, [hintKey]);

  const isPdf = isPdfContentType(contentType);

  function exportBaseName() {
    const slug = company
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
    const base = asResumeFileName(resume.fileName, contentType).replace(/\.(docx|pdf)$/i, "");
    return slug ? `${base}-${slug}` : base;
  }

  async function onDownload() {
    setExportError(null);
    setBusy(isPdf ? "pdf" : "docx");
    try {
      if (isPdf) {
        const blob = await editorApi.current?.exportPdf({
          download: true,
          fileName: exportBaseName(),
        });
        if (!blob) {
          setExportError("The résumé is still loading.");
        }
      } else {
        await editorApi.current?.exportDocx({
          download: true,
          fileName: exportBaseName(),
        });
      }
    } catch {
      setExportError(isPdf ? "We could not download the PDF." : "We could not download the Word file.");
    } finally {
      setBusy(null);
    }
  }

  async function onExportPdf() {
    setExportError(null);
    setBusy("pdf");
    try {
      const blob = await editorApi.current?.exportPdf({
        download: true,
        fileName: exportBaseName(),
      });
      if (!blob) {
        setExportError("The résumé is still loading.");
      }
    } catch {
      setExportError("We could not export a PDF of this résumé.");
    } finally {
      setBusy(null);
    }
  }

  const suggestionCount = synced ? pending.length : hints.length;
  const status = loading
    ? "Finding suggested edits…"
    : suggestionCount > 0
      ? `${suggestionCount} suggested edit${suggestionCount === 1 ? "" : "s"} in the document — tick to apply, cross to skip`
      : isPdf
        ? "Edit the original PDF, then download"
        : "Edit the original Word file, then download";

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-forest">
            Résumé for this role
          </p>
          <p className="mt-0.5 text-sm font-semibold tracking-tight text-ink">
            {status}
          </p>
          {exportError ? (
            <p className="mt-1 text-sm text-danger">{exportError}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {isPdf ? null : (
            <button
              type="button"
              onClick={() => void onExportPdf()}
              disabled={busy !== null}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] border border-line-strong bg-card px-3 py-2 text-sm font-semibold tracking-tight text-ink transition-colors duration-150 hover:bg-paper disabled:opacity-60"
            >
              <FilePdf size={16} weight="bold" />
              {busy === "pdf" ? "Exporting…" : "Export PDF"}
            </button>
          )}
          <button
            type="button"
            onClick={() => void onDownload()}
            disabled={busy !== null}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] bg-forest px-3 py-2 text-sm font-semibold tracking-tight text-paper transition-colors duration-150 hover:bg-forest-bright disabled:opacity-60"
          >
            <DownloadSimple size={16} weight="bold" />
            {busy === "docx" || (isPdf && busy === "pdf") ? "Downloading…" : isPdf ? "Download PDF" : "Download"}
          </button>
        </div>
      </div>

      <HintedDocument
        key={fileSrc ?? "none"}
        fileSrc={fileSrc}
        contentType={contentType}
        fileName={asResumeFileName(resume.fileName, contentType)}
        hints={hints}
        loading={loading}
        onApi={(api) => {
          editorApi.current = api;
        }}
        onPending={(nextPending) => {
          setPending(nextPending);
          setSynced(true);
        }}
        onError={(message) => setExportError(message)}
      />
    </div>
  );
}

function HintedDocument({
  fileSrc,
  contentType,
  fileName,
  hints,
  loading,
  onApi,
  onPending,
  onError,
}: {
  fileSrc: string | null;
  contentType: string | null;
  fileName: string;
  hints: Array<{ current: string; suggested: string; reason: string }>;
  loading: boolean;
  onApi: (api: DocxEditorApi) => void;
  onPending: (pending: ResumeHintAnchor[], missed: number) => void;
  onError: (message: string) => void;
}) {
  const editorApi = useRef<DocxEditorApi | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const appliedKey = useRef<string | null>(null);
  const missedRef = useRef(0);
  const onPendingRef = useRef(onPending);
  const onErrorRef = useRef(onError);
  const hintsRef = useRef(hints);
  const pendingRef = useRef<ResumeHintAnchor[]>([]);
  hintsRef.current = hints;
  useEffect(() => {
    onPendingRef.current = onPending;
    onErrorRef.current = onError;
  }, [onPending, onError]);
  const [editorReady, setEditorReady] = useState(false);
  const [editorEpoch, setEditorEpoch] = useState(0);
  const [pending, setPending] = useState<ResumeHintAnchor[]>([]);
  const [busyHint, setBusyHint] = useState<string | null>(null);
  const [rects, setRects] = useState<Record<string, HintRect>>({});
  const hintKey = hints
    .map((hint) => `${hint.current}=>${hint.suggested}`)
    .join("\n");
  const pendingKey = pending.map((anchor) => anchor.key).join("\n");
  pendingRef.current = pending;

  function pushPending(next: ResumeHintAnchor[], missed = missedRef.current) {
    missedRef.current = missed;
    pendingRef.current = next;
    setPending(next);
    queueMicrotask(() => onPendingRef.current(next, missed));
  }

  useEffect(() => {
    appliedKey.current = null;
    missedRef.current = 0;
    setPending([]);
    setRects({});
  }, [hintKey]);

  useEffect(() => {
    if (!editorReady || loading) {
      return;
    }
    const api = editorApi.current;
    if (!api || appliedKey.current === hintKey) {
      return;
    }
    const currentHints = hintsRef.current;
    const controller = new AbortController();
    void api
      .applyHints(currentHints, controller.signal)
      .then((result) => {
        if (
          controller.signal.aborted ||
          editorApi.current !== api ||
          result.aborted
        ) {
          return;
        }
        appliedKey.current = hintKey;
        pushPending(result.pending, result.missed);
      })
      .catch(() => {
        /* Editor was torn down, or the apply was aborted. */
      });
    return () => {
      controller.abort();
    };
  }, [editorReady, editorEpoch, loading, hintKey]);

  useEffect(() => {
    const api = editorApi.current;
    if (!api || pendingKey.length === 0) {
      return;
    }

    function measure() {
      const editor = editorApi.current;
      const root = overlayRef.current;
      if (!root || !editor) {
        return;
      }
      const scroller =
        root.querySelector<HTMLElement>(".superdoc-editor-container") ??
        root.querySelector<HTMLElement>(".resume-pdf-scroller") ??
        root;
      const page =
        root.querySelector<HTMLElement>(".superdoc-page") ??
        root.querySelector<HTMLElement>(".resume-pdf-page");
      const view = scroller.getBoundingClientRect();
      const pageBox = page?.getBoundingClientRect();
      const measured = editor.getHintRects(pendingRef.current, scroller);
      const next: Record<string, HintRect> = {};
      const buttonHeight = 28;
      const buttonWidth = 40;
      for (const [key, rect] of Object.entries(measured)) {
        const top = view.top + rect.top + (rect.height - buttonHeight) / 2;
        if (top + buttonHeight < view.top || top > view.bottom) {
          continue;
        }
        const pageLeft = pageBox?.left ?? view.left + rect.left;
        next[key] = {
          top,
          left: Math.max(8, pageLeft - buttonWidth - 8),
          width: buttonWidth,
          height: buttonHeight,
        };
      }
      setRects(next);
    }

    const frame = requestAnimationFrame(measure);
    const stop = api.observeViewport(measure);
    return () => {
      cancelAnimationFrame(frame);
      stop();
    };
  }, [pendingKey, editorReady]);

  async function decide(
    anchor: ResumeHintAnchor,
    decision: "accept" | "reject",
  ) {
    if (busyHint) {
      return;
    }
    setBusyHint(anchor.key);
    try {
      const api = editorApi.current;
      if (decision === "reject") {
        if (api) {
          await api.rejectHint(anchor);
        }
        pushPending(
          pendingRef.current.filter((item) => item.key !== anchor.key),
        );
        return;
      }
      if (!api) {
        onErrorRef.current("The résumé is still loading.");
        return;
      }
      const ok = await api.acceptHint(anchor);
      if (ok) {
        pushPending(
          pendingRef.current.filter((item) => item.key !== anchor.key),
        );
      } else {
        onErrorRef.current("We could not apply that edit.");
      }
    } catch {
      if (decision === "accept") {
        onErrorRef.current("We could not apply that edit.");
      }
    } finally {
      setBusyHint(null);
    }
  }

  return (
    <div ref={overlayRef} className="relative min-h-0 flex-1 overflow-hidden">
      <ResumeDocument
        fileSrc={fileSrc}
        contentType={contentType}
        fileName={fileName}
        documentMode="suggesting"
        onReady={(api) => {
          editorApi.current = api;
          appliedKey.current = null;
          onApi(api);
          queueMicrotask(() => {
            setEditorReady(true);
            setEditorEpoch((epoch) => epoch + 1);
          });
        }}
      />
      {pending.map((anchor) => {
        const rect = rects[anchor.key];
        if (!rect) {
          return null;
        }
        return (
          <HintButtons
            key={anchor.key}
            anchor={anchor}
            busy={busyHint === anchor.key}
            style={{ top: rect.top, left: rect.left }}
            onAccept={() => void decide(anchor, "accept")}
            onReject={() => void decide(anchor, "reject")}
            onFocus={() => void editorApi.current?.scrollToHint(anchor)}
          />
        );
      })}
    </div>
  );
}

function HintButtons({
  anchor,
  busy,
  style,
  onAccept,
  onReject,
  onFocus,
}: {
  anchor: ResumeHintAnchor;
  busy: boolean;
  style: { top: number; left: number };
  onAccept: () => void;
  onReject: () => void;
  onFocus: () => void;
}) {
  return (
    <div
      className="pointer-events-auto fixed z-40 flex border border-line bg-card shadow-sm"
      style={style}
    >
      <button
        type="button"
        title={`Apply: ${anchor.suggested}`}
        aria-label="Apply suggested rewrite"
        disabled={busy}
        onClick={onAccept}
        onFocus={onFocus}
        className="flex size-6 items-center justify-center border-r border-line text-forest transition-colors duration-150 hover:bg-[var(--add-soft)] disabled:opacity-50"
      >
        <Check size={13} weight="bold" />
      </button>
      <button
        type="button"
        title="Skip this suggestion"
        aria-label="Skip suggested rewrite"
        disabled={busy}
        onClick={onReject}
        className="flex size-6 items-center justify-center text-danger transition-colors duration-150 hover:bg-[var(--danger-soft)] disabled:opacity-50"
      >
        <X size={13} weight="bold" />
      </button>
    </div>
  );
}
