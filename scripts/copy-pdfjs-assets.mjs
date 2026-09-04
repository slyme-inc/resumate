import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const from = join(root, "node_modules/pdfjs-dist/build/pdf.worker.min.mjs");
const toDir = join(root, "public/pdfjs");
const to = join(toDir, "pdf.worker.min.mjs");

await mkdir(toDir, { recursive: true });
await copyFile(from, to);
