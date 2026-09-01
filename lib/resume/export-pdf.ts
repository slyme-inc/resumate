const CSS_PX_TO_PT = 72 / 96;

export type SuperdocZoomHost = {
  setZoom: (percent: number) => void;
  getZoomState: () => { mode: string; value: number };
  setZoomMode: (mode: "manual" | "fit-width") => void;
};

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function nextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function collectPages(root: ParentNode) {
  return Array.from(root.querySelectorAll<HTMLElement>(".superdoc-page"))
    .filter((page) => page.getBoundingClientRect().width > 0)
    .sort((a, b) => Number(a.dataset.pageIndex ?? 0) - Number(b.dataset.pageIndex ?? 0));
}

async function wakeVirtualizedPages(root: HTMLElement) {
  const scroller =
    root.querySelector<HTMLElement>(".superdoc-editor-container") ??
    root.querySelector<HTMLElement>("[data-sd-part='editor']") ??
    root;
  const origin = scroller.scrollTop;
  const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  const step = Math.max(240, Math.floor(scroller.clientHeight * 0.85) || 240);
  for (let y = 0; y <= max; y += step) {
    scroller.scrollTop = y;
    await nextFrame();
    await delay(20);
  }
  scroller.scrollTop = origin;
  await nextFrame();
}

async function ensurePainted(page: HTMLElement) {
  page.scrollIntoView({ block: "center", inline: "nearest" });
  for (let attempt = 0; attempt < 24; attempt += 1) {
    await nextFrame();
    await delay(20);
    if (
      (page.textContent ?? "").trim().length > 0 ||
      page.querySelector(".superdoc-text-run, img, .superdoc-fragment")
    ) {
      return;
    }
  }
}

function jpegBytesFromDataUrl(dataUrl: string) {
  const encoded = dataUrl.split(",")[1];
  if (!encoded) {
    throw new Error("We could not capture a résumé page.");
  }
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function showOverlay(root: HTMLElement) {
  const host = root.querySelector<HTMLElement>(".superdoc-editor-container") ?? root;
  const overlay = document.createElement("div");
  overlay.setAttribute("data-resume-pdf-overlay", "true");
  overlay.style.cssText = [
    "position:absolute",
    "inset:0",
    "z-index:40",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "background:rgba(255,255,255,0.78)",
    "color:#1b4f3e",
    "font:600 14px/1.4 ui-sans-serif, system-ui, sans-serif",
    "pointer-events:all",
  ].join(";");
  overlay.textContent = "Exporting PDF…";
  const previousPosition = host.style.position;
  if (getComputedStyle(host).position === "static") {
    host.style.position = "relative";
  }
  host.append(overlay);
  return () => {
    overlay.remove();
    host.style.position = previousPosition;
  };
}

export function downloadBlob(blob: Blob, fileName: string) {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 0);
}

export async function exportSuperdocToPdf(
  root: HTMLElement,
  superdoc: SuperdocZoomHost,
): Promise<Blob> {
  const [{ toJpeg }, { PDFDocument }] = await Promise.all([
    import("html-to-image"),
    import("pdf-lib"),
  ]);

  const zoom = superdoc.getZoomState();
  const scroller =
    root.querySelector<HTMLElement>(".superdoc-editor-container") ?? root;
  const scrollTop = scroller.scrollTop;
  const hideOverlay = showOverlay(root);

  try {
    superdoc.setZoom(100);
    await nextFrame();
    await delay(160);
    await wakeVirtualizedPages(root);

    const pages = collectPages(root);
    if (pages.length === 0) {
      throw new Error("The résumé has not finished rendering yet.");
    }

    const pdf = await PDFDocument.create();

    for (const page of pages) {
      await ensurePainted(page);
      const rect = page.getBoundingClientRect();
      const dataUrl = await toJpeg(page, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        quality: 0.92,
        cacheBust: false,
        style: {
          boxShadow: "none",
          transform: "none",
        },
      });
      const image = await pdf.embedJpg(jpegBytesFromDataUrl(dataUrl));
      const width = rect.width * CSS_PX_TO_PT;
      const height = rect.height * CSS_PX_TO_PT;
      const pdfPage = pdf.addPage([Math.max(1, width), Math.max(1, height)]);
      pdfPage.drawImage(image, {
        x: 0,
        y: 0,
        width: pdfPage.getWidth(),
        height: pdfPage.getHeight(),
      });
    }

    const bytes = await pdf.save();
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return new Blob([copy], { type: "application/pdf" });
  } finally {
    hideOverlay();
    if (zoom.mode === "fit-width") {
      superdoc.setZoomMode("fit-width");
    } else {
      superdoc.setZoom(zoom.value);
    }
    scroller.scrollTop = scrollTop;
  }
}
