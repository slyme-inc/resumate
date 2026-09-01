"use client";

import { ResumePreviewSkeleton } from "@/components/skeletons";
import { downloadBlob, exportSuperdocToPdf } from "@/lib/resume/export-pdf";
import {
  acceptResumeHint,
  applyResumeHints,
  getHintRect,
  getHintRects,
  observeHintViewport,
  rejectResumeHint,
  scrollToHint,
  type ApplyHintsResult,
  type HintRect,
  type ResumeHintAnchor,
} from "@/lib/resume/docx-hints";
import { asPdfFileName, DOCX_CONTENT_TYPE } from "@/lib/resume/file-type";
import { superdocFonts } from "@superdoc-dev/fonts";
import type { SuperDocInstance } from "@superdoc-dev/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import "superdoc/style.css";
import "@/app/home/docx-editor.css";

const SuperDocEditor = dynamic(
  () => import("@superdoc-dev/react").then((mod) => mod.SuperDocEditor),
  { ssr: false, loading: () => <ResumePreviewSkeleton /> },
);

const EDITOR_USER = { name: "Resumate", email: "hints@resumate.app" };

const EDITOR_MODULES = {
  trackChanges: {
    enabled: true,
    visible: true,
    mode: "review" as const,
    replacements: "paired" as const,
    authorColors: { enabled: false },
    semanticColors: {
      enabled: true,
      overrides: {
        insertion: "#1f6feb",
        deletion: "#cb0e47",
      },
    },
  },
};

const EDITOR_UI = {
  toolbar: {
    overflow: "visible" as const,
    responsiveTo: "container" as const,
    excludeItems: ["zoom"] as const,
  },
  comments: false as const,
};

const EDITOR_VIEW = { layout: "print" as const };
const EDITOR_ZOOM = { mode: "manual" as const, initial: 100 };
const EDITOR_INTERACTION = { trackedChanges: { allowDecisions: true } };
const EDITOR_STYLE = { height: "100%", minWidth: 0, maxWidth: "100%", overflow: "hidden" };

export type { ApplyHintsResult, HintRect, ResumeHintAnchor };

export type DocxEditorApi = {
  exportDocx: (options?: { download?: boolean; fileName?: string }) => Promise<Blob | null>;
  exportPdf: (options?: { download?: boolean; fileName?: string }) => Promise<Blob | null>;
  applyHints: (
    hints: Array<{ current: string; suggested: string; reason: string }>,
    signal?: AbortSignal,
  ) => Promise<ApplyHintsResult>;
  acceptHint: (anchor: ResumeHintAnchor) => Promise<boolean>;
  rejectHint: (anchor: ResumeHintAnchor) => Promise<boolean>;
  getHintRect: (anchor: ResumeHintAnchor, relativeTo: HTMLElement) => HintRect | null;
  getHintRects: (pending: ResumeHintAnchor[], relativeTo: HTMLElement) => Record<string, HintRect>;
  observeViewport: (listener: () => void) => () => void;
  scrollToHint: (anchor: ResumeHintAnchor) => Promise<void>;
};

function createEditorApi(
  superdoc: SuperDocInstance,
  getRoot: () => HTMLDivElement | null,
  fileName: string,
): DocxEditorApi {
  return {
    exportDocx: async (options) => {
      const result = await superdoc.export({
        exportType: ["docx"],
        triggerDownload: Boolean(options?.download),
        exportedName: options?.fileName?.replace(/\.docx$/i, ""),
      });
      return result instanceof Blob ? result : null;
    },
    exportPdf: async (options) => {
      const root = getRoot();
      if (!root) {
        return null;
      }
      const blob = await exportSuperdocToPdf(root, superdoc);
      if (options?.download) {
        downloadBlob(blob, asPdfFileName(options.fileName ?? fileName));
      }
      return blob;
    },
    applyHints: (hints, signal) => applyResumeHints(superdoc, hints, signal),
    acceptHint: (anchor) => acceptResumeHint(superdoc, anchor),
    rejectHint: (anchor) => rejectResumeHint(superdoc, anchor),
    getHintRect: (anchor, relativeTo) => getHintRect(superdoc, anchor, relativeTo),
    getHintRects: (pending, relativeTo) => getHintRects(superdoc, pending, relativeTo),
    observeViewport: (listener) => observeHintViewport(superdoc, listener, getRoot()),
    scrollToHint: (anchor) => scrollToHint(superdoc, anchor),
  };
}

export function DocxEditor({
  src,
  fileName,
  actions,
  onDirty,
  onReady,
  documentMode = "editing",
}: {
  src: string;
  fileName: string;
  actions?: ReactNode;
  onDirty?: () => void;
  onReady?: (api: DocxEditorApi) => void;
  documentMode?: "editing" | "suggesting" | "viewing";
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onDirtyRef = useRef(onDirty);
  const onReadyRef = useRef(onReady);
  onDirtyRef.current = onDirty;
  onReadyRef.current = onReady;

  const handleReady = useCallback(({ superdoc }: { superdoc: SuperDocInstance }) => {
    superdoc.setZoomMode?.("manual");
    superdoc.setZoom?.(100);
    onReadyRef.current?.(createEditorApi(superdoc, () => rootRef.current, fileName));
  }, [fileName]);

  const handleUpdate = useCallback(() => {
    onDirtyRef.current?.();
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(src, { credentials: "same-origin", cache: "no-store" });
        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? "Sign in again to view your résumé."
              : "We could not load your résumé file.",
          );
        }
        const blob = await response.arrayBuffer();
        if (cancelled) {
          return;
        }
        setError(null);
        setFile(new File([blob], fileName, { type: DOCX_CONTENT_TYPE }));
        setLoadedSrc(src);
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error ? caught.message : "We could not open that Word document.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src, fileName]);

  if (error) {
    return (
      <div className="flex h-full min-h-full items-center justify-center px-8 text-center">
        <p className="max-w-xs text-[15px] leading-relaxed text-danger">{error}</p>
      </div>
    );
  }

  if (!file || loadedSrc !== src) {
    return <ResumePreviewSkeleton />;
  }

  return (
    <div
      ref={rootRef}
      className="resume-docx-editor flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
    >
      <div className="flex min-w-0 items-center justify-between gap-4 border-b border-line bg-card px-6 py-3">
        <span className="truncate font-mono text-xs text-faint">{fileName}</span>
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <SuperDocEditor
          key={src}
          document={file}
          documentMode={documentMode}
          role="editor"
          format="docx"
          rulers
          contained
          viewOptions={EDITOR_VIEW}
          zoom={EDITOR_ZOOM}
          fonts={superdocFonts}
          ui={EDITOR_UI}
          user={EDITOR_USER}
          modules={EDITOR_MODULES}
          interaction={EDITOR_INTERACTION}
          style={EDITOR_STYLE}
          onEditorUpdate={handleUpdate}
          onReady={handleReady}
          onContentError={() => {
            setError("We could not open that Word document.");
          }}
          onException={() => {
            setError("The editor hit a problem with this document.");
          }}
        />
      </div>
    </div>
  );
}
