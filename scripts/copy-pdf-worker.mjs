// Copies the PDF.js worker into /public so the browser can load it as a plain file.
// Runs automatically before `npm run dev` and `npm run build` (see package.json),
// so the worker always matches the installed pdfjs-dist version.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const src = path.join(process.cwd(), "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const destDir = path.join(process.cwd(), "public", "pdfjs");
const dest = path.join(destDir, "pdf.worker.min.js");

if (!existsSync(src)) {
  console.error("PDF.js worker not found. Run: npm i pdfjs-dist");
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log("Copied PDF.js worker to public/pdfjs/pdf.worker.min.js");
