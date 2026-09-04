"use client";

import type { DocxEditorApi } from "@/app/home/docx-editor";
import { ResumePreviewSkeleton } from "@/components/skeletons";
import { exportEditedPdf } from "@/lib/resume/export-edited-pdf";
import { downloadBlob } from "@/lib/resume/export-pdf";
import { asPdfFileName } from "@/lib/resume/file-type";
import {
  acceptPdfHint,
  applyPdfHints,
  getPdfHintRect,
  getPdfHintRects,
} from "@/lib/resume/pdf-hints";
import {
  cssFontFamily,
  glyphFromTextItem,
  groupPdfGlyphs,
  isRunDirty,
  type PdfImageOverlay,
  type PdfPageSize,
  type PdfTextRun,
} from "@/lib/resume/pdf-runs";
import { Image as ImageIcon, Signature, TextT, X } from "@phosphor-icons/react";
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy, type PDFPageProxy } from "pdfjs-dist";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import "@/app/home/pdf-editor.css";

if (typeof window !== "undefined" && !GlobalWorkerOptions.workerSrc) {
  GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
}

type Tool = "select" | "text" | "image" | "signature";

type LoadedPage = {
  page: PDFPageProxy;
  width: number;
  height: number;
};

function nextId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function scaleToContainer(containerWidth: number, pageWidth: number, gutter = 0) {
  const available = containerWidth - gutter;
  if (available <= 0 || pageWidth <= 0) {
    return 1;
  }
  return available / pageWidth;
}

const HINT_GUTTER = 56;

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => reject(new Error("We could not read that image."));
    reader.readAsDataURL(file);
  });
}

function SignaturePad({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ratio = window.devicePixelRatio || 1;
    canvas.width = 420 * ratio;
    canvas.height = 140 * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 420, 140);
    ctx.strokeStyle = "#121a17";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }
    const box = canvas.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(18,26,23,0.28)] p-6">
      <div className="w-full max-w-md rounded-[14px] border border-line bg-card p-4 shadow-sm">
        <p className="text-sm font-semibold tracking-tight text-ink">Draw a signature</p>
        <canvas
          ref={canvasRef}
          className="mt-3 h-[140px] w-full cursor-crosshair rounded-[10px] border border-line bg-white"
          style={{ width: "100%", height: 140 }}
          onPointerDown={(event) => {
            drawing.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            const ctx = canvasRef.current?.getContext("2d");
            const at = point(event);
            if (!ctx || !at) {
              return;
            }
            ctx.beginPath();
            ctx.moveTo(at.x, at.y);
          }}
          onPointerMove={(event) => {
            if (!drawing.current) {
              return;
            }
            const ctx = canvasRef.current?.getContext("2d");
            const at = point(event);
            if (!ctx || !at) {
              return;
            }
            ctx.lineTo(at.x, at.y);
            ctx.stroke();
          }}
          onPointerUp={() => {
            drawing.current = false;
          }}
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[10px] border border-line-strong px-3 py-1.5 text-sm font-semibold tracking-tight text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              const canvas = canvasRef.current;
              if (!canvas) {
                return;
              }
              onConfirm(canvas.toDataURL("image/png"));
            }}
            className="rounded-[10px] bg-forest px-3 py-1.5 text-sm font-semibold tracking-tight text-paper"
          >
            Use signature
          </button>
        </div>
      </div>
    </div>
  );
}

function PdfHintBox({
  run,
  scale,
  suggested,
}: {
  run: PdfTextRun;
  scale: number;
  suggested: string;
}) {
  const lineHeight = Math.max(run.height, run.fontSize) * scale;
  const typeStyle = {
    fontSize: run.fontSize * scale,
    fontFamily: cssFontFamily(run.fontFamily),
    fontWeight: run.bold ? 700 : 400,
    fontStyle: run.italic ? "italic" : "normal",
  } as const;

  return (
    <div
      data-pdf-run={run.id}
      data-hint="true"
      className="resume-pdf-hint absolute"
      style={{
        left: run.x * scale,
        top: run.y * scale,
        maxWidth: `calc(100% - ${run.x * scale}px)`,
        ...typeStyle,
      }}
    >
      <div
        className="resume-pdf-hint-old"
        style={{
          minWidth: run.width * scale,
          minHeight: run.height * scale,
          lineHeight: `${lineHeight}px`,
        }}
      >
        {run.text}
      </div>
      <div
        data-pdf-hint-new=""
        className="resume-pdf-hint-new"
        style={{ lineHeight: `${lineHeight}px` }}
      >
        {suggested}
      </div>
    </div>
  );
}

function PdfRunBox({
  run,
  scale,
  suggested,
  readOnly,
  onChange,
}: {
  run: PdfTextRun;
  scale: number;
  suggested: string | null;
  readOnly: boolean;
  onChange: (text: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const focused = useRef(false);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || focused.current) {
      return;
    }
    if (node.textContent !== run.text) {
      node.textContent = run.text;
    }
  }, [run.text]);

  if (suggested != null) {
    return <PdfHintBox run={run} scale={scale} suggested={suggested} />;
  }

  const lineHeight = Math.max(run.height, run.fontSize) * scale;
  return (
    <div
      ref={ref}
      data-pdf-run={run.id}
      data-dirty={isRunDirty(run) ? "true" : "false"}
      data-hint="false"
      data-added={run.added ? "true" : "false"}
      role="textbox"
      tabIndex={readOnly ? -1 : 0}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      className="resume-pdf-run absolute"
      style={{
        left: run.x * scale,
        top: run.y * scale,
        minWidth: run.width * scale,
        minHeight: run.height * scale,
        fontSize: run.fontSize * scale,
        lineHeight: `${lineHeight}px`,
        fontFamily: cssFontFamily(run.fontFamily),
        fontWeight: run.bold ? 700 : 400,
        fontStyle: run.italic ? "italic" : "normal",
      }}
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={() => {
        focused.current = false;
      }}
      onInput={() => {
        onChange(ref.current?.textContent ?? "");
      }}
    />
  );
}

function PdfPageCanvas({ page, scale }: { page: PDFPageProxy; scale: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const viewport = page.getViewport({ scale });
    const outputScale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    const task = page.render({
      canvas,
      canvasContext: context,
      viewport,
      transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
    });
    task.promise.catch(() => undefined);
    return () => {
      task.cancel();
    };
  }, [page, scale]);

  return <canvas ref={canvasRef} className="block" />;
}

export function PdfEditor({
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const onDirtyRef = useRef(onDirty);
  const onReadyRef = useRef(onReady);

  const [error, setError] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [pages, setPages] = useState<LoadedPage[]>([]);
  const [scale, setScale] = useState(1);
  const [runs, setRuns] = useState<PdfTextRun[]>([]);
  const [images, setImages] = useState<PdfImageOverlay[]>([]);
  const [hintByRunId, setHintByRunId] = useState<Record<string, string>>({});
  const [tool, setTool] = useState<Tool>("select");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [signOpen, setSignOpen] = useState(false);

  const originalBytes = useRef<Uint8Array | null>(null);
  const runsRef = useRef<PdfTextRun[]>([]);
  const imagesRef = useRef<PdfImageOverlay[]>([]);
  const pageSizesRef = useRef<PdfPageSize[]>([]);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);

  const readOnly = documentMode === "viewing";

  useEffect(() => {
    onDirtyRef.current = onDirty;
    onReadyRef.current = onReady;
  });

  useEffect(() => {
    runsRef.current = runs;
  }, [runs]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const markDirty = useCallback(() => {
    onDirtyRef.current?.();
  }, []);

  const updateRuns = useCallback(
    (next: PdfTextRun[] | ((prev: PdfTextRun[]) => PdfTextRun[])) => {
      setRuns((prev) => {
        const value = typeof next === "function" ? next(prev) : next;
        runsRef.current = value;
        return value;
      });
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const scroller = scrollerRef.current;

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
        const buffer = await response.arrayBuffer();
        if (cancelled) {
          return;
        }
        const bytes = new Uint8Array(buffer);
        originalBytes.current = bytes.slice();
        const pdf = await getDocument({ data: bytes.slice() }).promise;
        if (cancelled) {
          void pdf.destroy();
          return;
        }
        pdfRef.current = pdf;

        const loaded: LoadedPage[] = [];
        const extracted: PdfTextRun[] = [];
        const sizes: PdfPageSize[] = [];
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1 });
          loaded.push({ page, width: viewport.width, height: viewport.height });
          sizes.push({ width: viewport.width, height: viewport.height });
          const content = await page.getTextContent();
          const glyphs = [];
          for (const item of content.items) {
            if (!("str" in item) || !("transform" in item)) {
              continue;
            }
            const style = content.styles[item.fontName];
            const glyph = glyphFromTextItem(
              {
                str: item.str,
                transform: item.transform,
                width: item.width,
                fontName: item.fontName,
                hasEOL: item.hasEOL,
              },
              viewport.transform,
              style,
            );
            if (glyph) {
              glyphs.push(glyph);
            }
          }
          extracted.push(...groupPdfGlyphs(pageNumber - 1, glyphs));
        }

        if (cancelled) {
          return;
        }
        if (extracted.length === 0) {
          throw new Error("This PDF has no selectable text.");
        }

        pageSizesRef.current = sizes;
        setPages(loaded);
        updateRuns(extracted);
        setImages([]);
        setError(null);
        setLoadedSrc(src);

        const width = scroller?.clientWidth ?? 720;
        const pageWidth = sizes[0]?.width || 612;
        const gutter = documentMode === "suggesting" ? HINT_GUTTER : 0;
        setScale(scaleToContainer(width, pageWidth, gutter));
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "We could not open that PDF.");
        }
      }
    })();

    return () => {
      cancelled = true;
      void pdfRef.current?.destroy();
      pdfRef.current = null;
    };
  }, [src, updateRuns]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || pageSizesRef.current.length === 0) {
      return;
    }
    const pageWidth = pageSizesRef.current[0]?.width || 612;
    const gutter = documentMode === "suggesting" ? HINT_GUTTER : 0;
    const resize = () => {
      setScale(scaleToContainer(scroller.clientWidth, pageWidth, gutter));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [loadedSrc, documentMode]);

  useEffect(() => {
    if (!loadedSrc || !originalBytes.current) {
      return;
    }
    const getRoot = () => rootRef.current;
    onReadyRef.current?.({
      exportDocx: async () => null,
      exportPdf: async (options) => {
        const bytes = originalBytes.current;
        if (!bytes) {
          return null;
        }
        const blob = await exportEditedPdf(
          bytes,
          runsRef.current,
          imagesRef.current,
          pageSizesRef.current,
        );
        if (options?.download) {
          downloadBlob(blob, asPdfFileName(options.fileName ?? fileName));
        }
        return blob;
      },
      applyHints: async (hints, signal) => {
        if (signal?.aborted) {
          return { pending: [], missed: hints.length, aborted: true };
        }
        const result = applyPdfHints(runsRef.current, hints, signal);
        const next: Record<string, string> = {};
        for (const anchor of result.pending) {
          if (typeof anchor.nodeId === "string") {
            next[anchor.nodeId] = anchor.suggested;
          }
        }
        setHintByRunId(next);
        return result;
      },
      acceptHint: async (anchor) => {
        const next = acceptPdfHint(runsRef.current, anchor);
        if (!next) {
          return false;
        }
        updateRuns(next);
        setHintByRunId((prev) => {
          const copy = { ...prev };
          delete copy[String(anchor.nodeId)];
          return copy;
        });
        markDirty();
        return true;
      },
      rejectHint: async (anchor) => {
        setHintByRunId((prev) => {
          const copy = { ...prev };
          delete copy[String(anchor.nodeId)];
          return copy;
        });
        return true;
      },
      getHintRect: (anchor, relativeTo) => {
        const root = getRoot();
        return root ? getPdfHintRect(root, anchor, relativeTo) : null;
      },
      getHintRects: (pending, relativeTo) => {
        const root = getRoot();
        return root ? getPdfHintRects(root, pending, relativeTo) : {};
      },
      observeViewport: (listener) => {
        const scroller = scrollerRef.current;
        if (!scroller) {
          return () => undefined;
        }
        scroller.addEventListener("scroll", listener, { passive: true });
        window.addEventListener("resize", listener);
        const observer = new ResizeObserver(listener);
        observer.observe(scroller);
        return () => {
          scroller.removeEventListener("scroll", listener);
          window.removeEventListener("resize", listener);
          observer.disconnect();
        };
      },
      scrollToHint: async (anchor) => {
        const root = getRoot();
        const id = typeof anchor.nodeId === "string" ? anchor.nodeId : null;
        if (!root || !id) {
          return;
        }
        root.querySelector(`[data-pdf-run="${CSS.escape(id)}"]`)?.scrollIntoView({
          block: "center",
          behavior: "smooth",
        });
      },
    });
  }, [fileName, loadedSrc, markDirty, updateRuns]);

  function pagePoint(pageIndex: number, clientX: number, clientY: number) {
    const pageNode = rootRef.current?.querySelectorAll<HTMLElement>(".resume-pdf-page")[pageIndex];
    if (!pageNode) {
      return null;
    }
    const box = pageNode.getBoundingClientRect();
    return {
      x: (clientX - box.left) / scale,
      y: (clientY - box.top) / scale,
    };
  }

  function placeImage(pageIndex: number, x: number, y: number, dataUrl: string) {
    const page = pageSizesRef.current[pageIndex];
    const width = Math.min(140, (page?.width ?? 400) * 0.28);
    const height = width * 0.36;
    setImages((prev) => {
      const next = [
        ...prev,
        {
          id: nextId("img"),
          pageIndex,
          x: Math.max(0, x - width / 2),
          y: Math.max(0, y - height / 2),
          width,
          height,
          dataUrl,
        },
      ];
      imagesRef.current = next;
      return next;
    });
    setPendingImage(null);
    setTool("select");
    markDirty();
  }

  function handlePageClick(pageIndex: number, event: React.MouseEvent<HTMLDivElement>) {
    if (readOnly) {
      return;
    }
    const at = pagePoint(pageIndex, event.clientX, event.clientY);
    if (!at) {
      return;
    }
    if (pendingImage) {
      placeImage(pageIndex, at.x, at.y, pendingImage);
      return;
    }
    if (tool !== "text") {
      return;
    }
    const run: PdfTextRun = {
      id: nextId("run"),
      pageIndex,
      text: "New text",
      originalText: "",
      x: at.x,
      y: at.y,
      width: 160,
      height: 14,
      fontSize: 11,
      fontFamily: "Helvetica",
      bold: false,
      italic: false,
      added: true,
    };
    updateRuns((prev) => [...prev, run]);
    setTool("select");
    markDirty();
  }

  if (error) {
    return (
      <div className="flex h-full min-h-full items-center justify-center px-8 text-center">
        <p className="max-w-xs text-[15px] leading-relaxed text-danger">{error}</p>
      </div>
    );
  }

  if (!loadedSrc || loadedSrc !== src || pages.length === 0) {
    return <ResumePreviewSkeleton />;
  }

  return (
    <div ref={rootRef} className="resume-pdf-editor flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="flex min-w-0 items-center justify-between gap-4 border-b border-line bg-card px-6 py-3">
        <span className="truncate font-mono text-xs text-faint">{fileName}</span>
        <div className="flex shrink-0 items-center gap-2">
          {readOnly ? null : (
            <>
              <button
                type="button"
                data-active={tool === "text"}
                title="Add text"
                onClick={() => {
                  setTool("text");
                  setPendingImage(null);
                }}
                className="resume-pdf-tool inline-flex items-center gap-1.5 rounded-[10px] border border-line-strong bg-card px-2.5 py-1.5 text-sm font-semibold tracking-tight text-ink"
              >
                <TextT size={15} weight="bold" />
                Text
              </button>
              <label className="resume-pdf-tool inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-line-strong bg-card px-2.5 py-1.5 text-sm font-semibold tracking-tight text-ink">
                <ImageIcon size={15} weight="bold" />
                Image
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) {
                      return;
                    }
                    void fileToDataUrl(file).then((dataUrl) => {
                      setPendingImage(dataUrl);
                      setTool("image");
                    });
                  }}
                />
              </label>
              <button
                type="button"
                title="Add signature"
                onClick={() => setSignOpen(true)}
                className="resume-pdf-tool inline-flex items-center gap-1.5 rounded-[10px] border border-line-strong bg-card px-2.5 py-1.5 text-sm font-semibold tracking-tight text-ink"
              >
                <Signature size={15} weight="bold" />
                Sign
              </button>
            </>
          )}
          {actions}
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="resume-pdf-scroller min-h-0 min-w-0 flex-1 overflow-auto"
      >
        <div
          className="flex w-full flex-col"
          style={documentMode === "suggesting" ? { paddingLeft: HINT_GUTTER } : undefined}
        >
          {pages.map((item, pageIndex) => (
            <div
              key={pageIndex}
              className="resume-pdf-page relative"
              data-page-index={pageIndex}
              style={{ width: item.width * scale, height: item.height * scale }}
              onClick={(event) => {
                if (event.target === event.currentTarget || event.target instanceof HTMLCanvasElement) {
                  handlePageClick(pageIndex, event);
                }
              }}
            >
              <PdfPageCanvas page={item.page} scale={scale} />
              {runs
                .filter((run) => run.pageIndex === pageIndex)
                .map((run) => (
                  <PdfRunBox
                    key={run.id}
                    run={run}
                    scale={scale}
                    suggested={hintByRunId[run.id] ?? null}
                    readOnly={readOnly}
                    onChange={(text) => {
                      updateRuns((prev) =>
                        prev.map((itemRun) => (itemRun.id === run.id ? { ...itemRun, text } : itemRun)),
                      );
                      markDirty();
                    }}
                  />
                ))}
              {images
                .filter((image) => image.pageIndex === pageIndex)
                .map((image) => (
                  <div
                    key={image.id}
                    className="resume-pdf-image absolute"
                    style={{
                      left: image.x * scale,
                      top: image.y * scale,
                      width: image.width * scale,
                      height: image.height * scale,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.dataUrl} alt="" className="h-full w-full object-contain" />
                    {readOnly ? null : (
                      <button
                        type="button"
                        aria-label="Remove image"
                        onClick={() => {
                          setImages((prev) => {
                            const next = prev.filter((itemImage) => itemImage.id !== image.id);
                            imagesRef.current = next;
                            return next;
                          });
                          markDirty();
                        }}
                        className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full border border-line bg-card text-danger"
                      >
                        <X size={10} weight="bold" />
                      </button>
                    )}
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
      {tool === "text" || pendingImage ? (
        <p className="border-t border-line bg-card px-6 py-2 text-xs text-muted">
          {pendingImage ? "Click the page to place the image." : "Click the page to add a text box."}
        </p>
      ) : null}
      {signOpen ? (
        <SignaturePad
          onCancel={() => setSignOpen(false)}
          onConfirm={(dataUrl) => {
            setSignOpen(false);
            setPendingImage(dataUrl);
            setTool("signature");
          }}
        />
      ) : null}
    </div>
  );
}
