"use client";

import "@/app/home/pdf-preview.css";
import { displayLinkTargets, normalizeHref } from "@/lib/resume/links";
import type { ResumeLink } from "@/lib/resume/types";
import { useEffect, useRef, useState } from "react";

type PdfjsModule = typeof import("pdfjs-dist");
type PdfDocument = Awaited<ReturnType<PdfjsModule["getDocument"]>["promise"]>;

/** Copied out of node_modules by `scripts/copy-pdfjs-assets.mjs`. */
const ASSET_BASE = "/pdfjs/";

/** Roughly Safari's per-canvas ceiling; beyond it the canvas comes back blank. */
const MAX_CANVAS_PIXELS = 2 ** 24;
const MAX_CANVAS_DIM = 32_767;

let pdfjsModule: Promise<PdfjsModule> | null = null;

function loadPdfjs() {
  pdfjsModule ??= import("pdfjs-dist").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = `${ASSET_BASE}pdf.worker.min.mjs`;
    return pdfjs;
  });
  return pdfjsModule;
}

/**
 * pdf.js rounds the canvas backing store down to a whole multiple of the
 * output scale's denominator so that a device pixel never straddles two page
 * pixels. `approximateFraction` and `floorToDivide` are ports of the helpers
 * its own viewer uses for this; keeping them identical is what lets the text
 * layer line up with the painted glyphs.
 */
function approximateFraction(value: number): [number, number] {
  if (Math.floor(value) === value) {
    return [value, 1];
  }

  const inverse = 1 / value;
  const limit = 8;
  if (inverse > limit) {
    return [1, limit];
  }
  if (Math.floor(inverse) === inverse) {
    return [1, inverse];
  }

  const target = value > 1 ? inverse : value;
  let a = 0;
  let b = 1;
  let c = 1;
  let d = 1;

  while (true) {
    const p = a + c;
    const q = b + d;
    if (q > limit) {
      break;
    }
    if (target <= p / q) {
      c = p;
      d = q;
    } else {
      a = p;
      b = q;
    }
  }

  const numerator = target - a / b < c / d - target ? [a, b] : [c, d];
  return (value > 1 ? [numerator[1], numerator[0]] : numerator) as [number, number];
}

function floorToDivide(value: number, divisor: number) {
  return value - (value % divisor);
}

let cssRound: ((value: number) => number) | null = null;

/**
 * Chrome's `round()` works on float32, so the canvas size has to be computed
 * the same way or it disagrees with the CSS width pdf.js gives the text layer.
 */
function roundLikeCss(value: number) {
  if (!cssRound) {
    const probe = window.document.createElement("div");
    probe.style.width = "round(down, calc(1.6666666666666665 * 792px), 1px)";
    cssRound = probe.style.width === "calc(1320px)" ? Math.fround : (input) => input;
  }
  return cssRound(value);
}

function createLinkService(
  pdfDocument: PdfDocument,
  pageNumber: number,
  goToPage: (page: number) => void,
) {
  return {
    externalLinkEnabled: true,
    eventBus: null,
    get pagesCount() {
      return pdfDocument.numPages;
    },
    get page() {
      return pageNumber;
    },
    set page(value: number) {
      goToPage(value);
    },
    get rotation() {
      return 0;
    },
    set rotation(_value: number) {},
    get isInPresentationMode() {
      return false;
    },
    addLinkAttributes(link: HTMLAnchorElement, url: string) {
      link.href = url;
      link.target = "_blank";
      link.rel = "noreferrer noopener";
    },
    getDestinationHash() {
      return "#";
    },
    getAnchorUrl() {
      return "#";
    },
    async goToDestination(dest: string | unknown[]) {
      const explicit =
        typeof dest === "string" ? await pdfDocument.getDestination(dest) : dest;
      if (!Array.isArray(explicit)) {
        return;
      }

      const destRef = explicit[0];
      let nextPage: number | null = null;
      if (destRef && typeof destRef === "object") {
        nextPage = (await pdfDocument.getPageIndex(destRef)) + 1;
      } else if (Number.isInteger(destRef)) {
        nextPage = (destRef as number) + 1;
      }

      if (nextPage) {
        goToPage(nextPage);
      }
    },
    executeNamedAction(action: string) {
      if (action === "FirstPage") {
        goToPage(1);
      } else if (action === "LastPage") {
        goToPage(pdfDocument.numPages);
      } else if (action === "NextPage") {
        goToPage(pageNumber + 1);
      } else if (action === "PrevPage") {
        goToPage(pageNumber - 1);
      }
    },
    async executeSetOCGState() {},
    async getAttachmentContent() {
      return null;
    },
  };
}

const EMAIL_IN_TEXT_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL_IN_TEXT_RE =
  /\b(?:https?:\/\/|www\.)[^\s|<>]+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)+\.(?:com|dev|io|me|co|ai|app|net|org)\b/gi;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hrefForRawMatch(value: string) {
  if (value.includes("@") && !value.startsWith("mailto:")) {
    return `mailto:${value}`;
  }
  if (value.startsWith("www.")) {
    return normalizeHref(`https://${value}`);
  }
  const normalized = normalizeHref(value);
  if (normalized) {
    return normalized;
  }
  if (/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(value)) {
    return `https://${value}`;
  }
  return null;
}

function overlayTextLinks(
  textRoot: HTMLElement,
  pageElement: HTMLElement,
  overlayRoot: HTMLElement,
  links: ResumeLink[],
  email: string | null,
) {
  overlayRoot.replaceChildren();

  const targets = displayLinkTargets(links, email);
  const found: { start: number; end: number; href: string; node: Text }[] = [];

  const walker = document.createTreeWalker(textRoot, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const textNode = node as Text;
    const value = textNode.data;
    const claimed = new Array<boolean>(value.length).fill(false);

    const addMatch = (start: number, end: number, href: string) => {
      if (start < 0 || end <= start) {
        return;
      }
      for (let index = start; index < end; index += 1) {
        if (claimed[index]) {
          return;
        }
      }
      for (let index = start; index < end; index += 1) {
        claimed[index] = true;
      }
      found.push({ start, end, href, node: textNode });
    };

    for (const target of targets) {
      const pattern = new RegExp(escapeRegExp(target.text), "ig");
      let match = pattern.exec(value);
      while (match) {
        addMatch(match.index, match.index + match[0].length, target.href);
        match = pattern.exec(value);
      }
    }

    for (const pattern of [EMAIL_IN_TEXT_RE, URL_IN_TEXT_RE]) {
      pattern.lastIndex = 0;
      let match = pattern.exec(value);
      while (match) {
        const href = hrefForRawMatch(match[0].replace(/[.,;]+$/, ""));
        if (href) {
          addMatch(match.index, match.index + match[0].length, href);
        }
        match = pattern.exec(value);
      }
    }

    node = walker.nextNode();
  }

  const pageBox = pageElement.getBoundingClientRect();
  for (const match of found) {
    const range = document.createRange();
    range.setStart(match.node, match.start);
    range.setEnd(match.node, match.end);
    for (const rect of range.getClientRects()) {
      if (rect.width < 2 || rect.height < 2) {
        continue;
      }
      const link = document.createElement("a");
      link.className = "pdf-text-link";
      link.href = match.href;
      link.target = "_blank";
      link.rel = "noreferrer noopener";
      link.style.left = `${rect.left - pageBox.left}px`;
      link.style.top = `${rect.top - pageBox.top}px`;
      link.style.width = `${rect.width}px`;
      link.style.height = `${rect.height}px`;
      overlayRoot.append(link);
    }
  }
}

function isCancellation(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "RenderingCancelledException" || error.name === "AbortException")
  );
}

async function fetchPdfBytes(src: string) {
  const response = await fetch(src, { credentials: "same-origin", cache: "no-store" });

  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? "Sign in again to view your résumé."
        : "We could not load your résumé file.",
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/pdf")) {
    throw new Error("We could not load your résumé file.");
  }

  return new Uint8Array(await response.arrayBuffer());
}

export function PdfPreview({
  src,
  fileName,
  links = [],
  email = null,
}: {
  src: string;
  fileName: string;
  links?: ResumeLink[];
  email?: string | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const annotationLayerRef = useRef<HTMLDivElement>(null);
  const detectedLinkRef = useRef<HTMLDivElement>(null);

  const [pdfDocument, setPdfDocument] = useState<PdfDocument | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [loadedSrc, setLoadedSrc] = useState(src);

  if (loadedSrc !== src) {
    setLoadedSrc(src);
    setPdfDocument(null);
    setPageCount(0);
    setPageNumber(1);
    setError(null);
    setIsRendered(false);
  }

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setAvailableWidth(entry.contentRect.width);
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: { destroy: () => Promise<void> } | null = null;

    void (async () => {
      try {
        const [pdfjs, data] = await Promise.all([loadPdfjs(), fetchPdfBytes(src)]);
        if (cancelled) {
          return;
        }

        // Without these the worker silently substitutes fonts and drops
        // CJK/Type0 encodings, which is exactly the inaccuracy we're avoiding.
        const task = pdfjs.getDocument({
          data,
          cMapUrl: `${ASSET_BASE}cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `${ASSET_BASE}standard_fonts/`,
          iccUrl: `${ASSET_BASE}iccs/`,
          wasmUrl: `${ASSET_BASE}wasm/`,
          // Substituting local system fonts makes rendering depend on the
          // reader's OS; pdf.js' bundled metric-compatible fonts do not.
          useSystemFonts: false,
        });
        loadingTask = task;

        const opened = await task.promise;
        if (cancelled) {
          return;
        }

        setPageCount(opened.numPages);
        setPdfDocument(opened);
      } catch (caught) {
        if (cancelled) {
          return;
        }
        setError(
          caught instanceof Error ? caught.message : "We could not load your résumé file.",
        );
      }
    })();

    return () => {
      cancelled = true;
      void loadingTask?.destroy();
    };
  }, [src]);

  useEffect(() => {
    if (!pdfDocument || availableWidth <= 0) {
      return;
    }

    let cancelled = false;
    let renderTask: { cancel: () => void } | null = null;
    let textLayer: { cancel: () => void } | null = null;

    void (async () => {
      try {
        const pdfjs = await loadPdfjs();
        const page = await pdfDocument.getPage(pageNumber);
        const pageElement = pageRef.current;
        const canvas = canvasRef.current;
        const textElement = textLayerRef.current;
        const annotationElement = annotationLayerRef.current;
        const detectedLinks = detectedLinkRef.current;

        if (
          cancelled ||
          !pageElement ||
          !canvas ||
          !textElement ||
          !annotationElement ||
          !detectedLinks
        ) {
          return;
        }

        textElement.replaceChildren();
        annotationElement.replaceChildren();

        const unscaled = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: availableWidth / unscaled.width });

        const outputScale = new pdfjs.OutputScale();
        outputScale.limitCanvas(
          viewport.width,
          viewport.height,
          MAX_CANVAS_PIXELS,
          MAX_CANVAS_DIM,
        );

        const [sxNumerator, sxDivisor] = approximateFraction(outputScale.sx);
        const [syNumerator, syDivisor] = approximateFraction(outputScale.sy);

        canvas.width = floorToDivide(
          roundLikeCss(viewport.width * outputScale.sx),
          sxNumerator,
        );
        canvas.height = floorToDivide(
          roundLikeCss(viewport.height * outputScale.sy),
          syNumerator,
        );
        outputScale.sx = canvas.width / floorToDivide(roundLikeCss(viewport.width), sxDivisor);
        outputScale.sy =
          canvas.height / floorToDivide(roundLikeCss(viewport.height), syDivisor);

        pageElement.style.setProperty("--scale-factor", String(viewport.scale));
        pageElement.style.setProperty("--user-unit", String(viewport.userUnit));
        pageElement.style.setProperty("--scale-round-x", `${sxDivisor}px`);
        pageElement.style.setProperty("--scale-round-y", `${syDivisor}px`);
        pdfjs.setLayerDimensions(pageElement, viewport, true, false);

        const task = page.render({
          canvas,
          viewport,
          transform: outputScale.scaled
            ? [outputScale.sx, 0, 0, outputScale.sy, 0, 0]
            : undefined,
          annotationMode: pdfjs.AnnotationMode.ENABLE,
          background: "#ffffff",
        });
        renderTask = task;
        await task.promise;

        if (cancelled) {
          return;
        }

        textElement.replaceChildren();
        const layer = new pdfjs.TextLayer({
          textContentSource: page.streamTextContent(),
          container: textElement,
          viewport,
        });
        textLayer = layer;
        await layer.render();

        if (cancelled) {
          return;
        }

        const annotations = await page.getAnnotations({ intent: "display" });
        const annotationViewport = viewport.clone({ dontFlip: true });
        const linkService = createLinkService(pdfDocument, pageNumber, (nextPage) => {
          setPageNumber(Math.min(pdfDocument.numPages, Math.max(1, nextPage)));
        });
        pdfjs.setLayerDimensions(annotationElement, viewport);
        const annotationLayer = new pdfjs.AnnotationLayer({
          div: annotationElement,
          page,
          viewport: annotationViewport,
          linkService: linkService as never,
          accessibilityManager: null,
          annotationCanvasMap: null,
          annotationEditorUIManager: null,
          structTreeLayer: null,
          commentManager: null,
          annotationStorage: null,
        });
        await annotationLayer.render({
          annotations,
          viewport: annotationViewport,
          div: annotationElement,
          page,
          linkService: linkService as never,
          renderForms: false,
          enableScripting: false,
        });

        pageElement.style.visibility = "visible";
        overlayTextLinks(textElement, pageElement, detectedLinks, links, email);

        if (!cancelled) {
          setIsRendered(true);
        }
      } catch (caught) {
        if (cancelled || isCancellation(caught)) {
          return;
        }
        setError("We could not render this page.");
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
      textLayer?.cancel();
    };
  }, [pdfDocument, pageNumber, availableWidth, links, email]);

  if (error) {
    return (
      <div className="flex h-full min-h-full items-center justify-center px-8 text-center">
        <p className="max-w-xs text-[15px] leading-relaxed text-danger">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-full flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-3">
        <span className="truncate font-mono text-xs text-faint">{fileName}</span>
        {pageCount > 1 ? (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
              disabled={pageNumber <= 1}
              className="rounded-[8px] border border-line px-2.5 py-1 text-xs font-medium text-ink transition-colors duration-150 ease-out enabled:hover:border-line-strong disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-mono text-xs tabular-nums text-muted">
              {pageNumber} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPageNumber((current) => Math.min(pageCount, current + 1))}
              disabled={pageNumber >= pageCount}
              className="rounded-[8px] border border-line px-2.5 py-1 text-xs font-medium text-ink transition-colors duration-150 ease-out enabled:hover:border-line-strong disabled:opacity-40"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto p-6">
        <div
          ref={pageRef}
          className="pdf-page mx-auto shadow-[0_1px_2px_rgba(18,26,23,0.06),0_12px_32px_rgba(18,26,23,0.10)]"
          style={{ visibility: isRendered ? "visible" : "hidden" }}
        >
          <div className="pdf-canvas-wrapper">
            <canvas ref={canvasRef} role="presentation" />
          </div>
          <div ref={textLayerRef} className="textLayer" />
          <div ref={annotationLayerRef} className="annotationLayer" />
          <div ref={detectedLinkRef} className="pdf-detected-links" />
        </div>
      </div>
    </div>
  );
}
