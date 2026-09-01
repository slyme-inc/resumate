"use client";

import { ResumeDocument } from "@/app/home/resume-document";
import type { DocxEditorApi, HintRect, ResumeHintAnchor } from "@/app/home/docx-editor";
import type { OpportunityInsight } from "@/lib/ai/types";
import { asDocxFileName } from "@/lib/resume/file-type";
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
    const fromModel = attachSuggestions(lines, insight?.resumeFit.improve ?? []);
    return mergeSuggestions(fromModel, skillReorderSuggestions(lines, focusSkills));
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
  const hintKey = hints.map((hint) => `${hint.current}=>${hint.suggested}`).join("\n");
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    setSynced(false);
  }, [hintKey]);

  function exportBaseName() {
    const slug = company
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
    const base = asDocxFileName(resume.fileName).replace(/\.docx$/i, "");
    return slug ? `${base}-${slug}` : base;
  }

  async function onDownload() {
    setExportError(null);
    setBusy("docx");
    try {
      await editorApi.current?.exportDocx({
        download: true,
        fileName: exportBaseName(),
      });
    } catch {
      setExportError("We could not download the Word file.");
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
      : "Edit the original Word file, then download";

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-forest">
            Résumé for this role
          </p>
          <p className="mt-0.5 text-sm font-semibold tracking-tight text-ink">{status}</p>
          {exportError ? <p className="mt-1 text-sm text-danger">{exportError}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => void onExportPdf()}
            disabled={busy !== null}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] border border-line-strong bg-card px-3 py-2 text-sm font-semibold tracking-tight text-ink transition-colors duration-150 hover:bg-paper disabled:opacity-60"
          >
            <FilePdf size={16} weight="bold" />
            {busy === "pdf" ? "Exporting…" : "Export PDF"}
          </button>
          <button
            type="button"
            onClick={() => void onDownload()}
            disabled={busy !== null}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] bg-forest px-3 py-2 text-sm font-semibold tracking-tight text-paper transition-colors duration-150 hover:bg-forest-bright disabled:opacity-60"
          >
            <DownloadSimple size={16} weight="bold" />
            {busy === "docx" ? "Downloading…" : "Download"}
          </button>
        </div>
      </div>

      <HintedDocument
        key={fileSrc ?? "none"}
        fileSrc={fileSrc}
        contentType={contentType}
        fileName={asDocxFileName(resume.fileName)}
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
  const hintKey = hints.map((hint) => `${hint.current}=>${hint.suggested}`).join("\n");
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
        if (controller.signal.aborted || editorApi.current !== api || result.aborted) {
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
      const overlay = overlayRef.current;
      const editor = editorApi.current;
      if (!overlay || !editor) {
        return;
      }
      const measured = editor.getHintRects(pendingRef.current, overlay);
      const next: Record<string, HintRect> = {};
      for (const [key, rect] of Object.entries(measured)) {
        next[key] = {
          top: rect.top,
          left: rect.left + rect.width + 6,
          width: 56,
          height: Math.max(24, rect.height),
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

  async function decide(anchor: ResumeHintAnchor, decision: "accept" | "reject") {
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
        pushPending(pendingRef.current.filter((item) => item.key !== anchor.key));
        return;
      }
      if (!api) {
        onErrorRef.current("The Word file is still loading.");
        return;
      }
      const ok = await api.acceptHint(anchor);
      if (ok) {
        pushPending(pendingRef.current.filter((item) => item.key !== anchor.key));
      } else {
        onErrorRef.current("We could not apply that edit in the Word file.");
      }
    } catch {
      if (decision === "accept") {
        onErrorRef.current("We could not apply that edit in the Word file.");
      }
    } finally {
      setBusyHint(null);
    }
  }

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
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
      <div ref={overlayRef} className="pointer-events-none absolute inset-0 z-10">
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
      className="pointer-events-auto absolute flex gap-0.5 rounded-full border border-line bg-card/95 p-0.5 shadow-sm backdrop-blur-sm"
      style={style}
    >
      <button
        type="button"
        title={`Apply: ${anchor.suggested}`}
        aria-label="Apply suggested rewrite"
        disabled={busy}
        onClick={onAccept}
        onFocus={onFocus}
        className="flex size-6 items-center justify-center rounded-full text-forest transition-colors duration-150 hover:bg-[var(--add-soft)] disabled:opacity-50"
      >
        <Check size={13} weight="bold" />
      </button>
      <button
        type="button"
        title="Skip this suggestion"
        aria-label="Skip suggested rewrite"
        disabled={busy}
        onClick={onReject}
        className="flex size-6 items-center justify-center rounded-full text-danger transition-colors duration-150 hover:bg-[var(--danger-soft)] disabled:opacity-50"
      >
        <X size={13} weight="bold" />
      </button>
    </div>
  );
}
