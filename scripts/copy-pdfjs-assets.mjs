import { cp, mkdir, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

// pdf.js resolves CMaps, the standard 14 fonts, ICC profiles and its image
// decoders at runtime rather than through the bundler. Without them, PDFs that
// rely on unembedded fonts or CJK encodings render with substituted glyphs and
// wrong metrics, so the copies are served from /pdfjs instead.
const ASSETS = [
  { from: "build/pdf.worker.min.mjs", to: "pdf.worker.min.mjs" },
  { from: "cmaps", to: "cmaps" },
  { from: "standard_fonts", to: "standard_fonts" },
  { from: "iccs", to: "iccs" },
  { from: "wasm", to: "wasm" },
];

const require = createRequire(import.meta.url);
const pdfjsRoot = dirname(require.resolve("pdfjs-dist/package.json"));
const target = resolve(import.meta.dirname, "..", "public", "pdfjs");

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });

for (const asset of ASSETS) {
  await cp(join(pdfjsRoot, asset.from), join(target, asset.to), {
    recursive: true,
  });
}

console.log(`Copied pdf.js runtime assets to ${target}`);
