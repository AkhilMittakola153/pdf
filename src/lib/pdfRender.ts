// PDF.js helpers: open a PDF and render pages to images in the browser.
import type { PDFDocumentProxy } from "pdfjs-dist";
import { MAX_CANVAS_AREA } from "@/lib/image";

export type PdfDoc = PDFDocumentProxy;
export type ImageFormat = "image/jpeg" | "image/png";

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

/** Load PDF.js once, only when a PDF is opened (keeps the page fast). */
function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((lib) => {
      // The worker parses PDFs on a background thread so the page never freezes.
      lib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.js";
      return lib;
    });
  }
  return pdfjsPromise;
}

export type OpenedPdf = {
  doc: PdfDoc;
  /** Frees memory on the page and in the worker. Always call when done. */
  close: () => Promise<void>;
};

/** Open a PDF. Pass `password` for protected files (it's used only in this browser). */
export async function openPdf(file: File, password?: string): Promise<OpenedPdf> {
  const lib = await loadPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const task = lib.getDocument(password ? { data, password } : { data });
  let doc: PdfDoc;
  try {
    doc = await task.promise;
  } catch (e) {
    void Promise.resolve(task.destroy?.()).catch(() => undefined); // free the worker, e.g. after a wrong password
    throw e;
  }
  // PDF.js recommends destroying the *loading task* (not the document) to clean up
  const close = async () => {
    try {
      if (typeof task.destroy === "function") await task.destroy();
    } catch {
      // already closed
    }
  };
  return { doc, close };
}

/** "need" = asks for a password, "wrong" = the password given was incorrect, null = not a password problem. */
export function passwordProblem(e: unknown): "need" | "wrong" | null {
  if (!(e instanceof Error) || e.name !== "PasswordException") return null;
  return (e as Error & { code?: number }).code === 2 ? "wrong" : "need";
}

export function describePdfjsError(e: unknown): string {
  const name = e instanceof Error ? e.name : "";
  if (name === "PasswordException") return "This PDF is password-protected. Remove the password first, then try again.";
  if (name === "InvalidPDFException") return "This file is damaged or not a valid PDF.";
  return "This PDF could not be opened.";
}

/** Size of page 1 in points (72 points = 1 inch). */
export async function firstPageSize(doc: PdfDoc) {
  const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: 1 });
  return { width: vp.width, height: vp.height };
}

/**
 * Render one page to an image.
 * scale = DPI / 72 (e.g. 150 DPI → scale ≈ 2.08).
 * Very large pages are scaled down to stay under the phone canvas limit.
 */
export async function renderPage(
  doc: PdfDoc,
  pageNumber: number,
  scale: number,
  type: ImageFormat,
  quality = 0.9,
): Promise<{ blob: Blob; width: number; height: number; reduced: boolean }> {
  const page = await doc.getPage(pageNumber);
  let viewport = page.getViewport({ scale });
  let reduced = false;
  const area = viewport.width * viewport.height;
  if (area > MAX_CANVAS_AREA) {
    viewport = page.getViewport({ scale: scale * Math.sqrt(MAX_CANVAS_AREA / area) * 0.99 });
    reduced = true;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas is not available in this browser.");
  ctx.fillStyle = "#ffffff"; // white paper behind the page
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Passed as a variable so it works with both older and newer PDF.js type definitions
  const params = { canvasContext: ctx, canvas, viewport };
  await page.render(params).promise;

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("could not save the image."))),
      type,
      type === "image/jpeg" ? quality : undefined,
    ),
  );
  const result = { blob, width: canvas.width, height: canvas.height, reduced };
  canvas.width = canvas.height = 0; // free memory
  return result;
}

/** Small JPEG preview of a page, about `width` px wide. */
export async function renderThumbnail(doc: PdfDoc, pageNumber: number, width = 160): Promise<Blob> {
  const page = await doc.getPage(pageNumber);
  const scale = width / page.getViewport({ scale: 1 }).width;
  const { blob } = await renderPage(doc, pageNumber, scale, "image/jpeg", 0.7);
  return blob;
}

/**
 * Parse "1-3, 5, 8-10" into [1,2,3,5,8,9,10].
 * Returns null if the text is empty or has an invalid part.
 */
export function parsePageRange(text: string, max: number): number[] | null {
  const pages = new Set<number>();
  const parts = text.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  for (const part of parts) {
    const m = part.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
    if (!m) return null;
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    if (a < 1 || b > max || a > b) return null;
    for (let p = a; p <= b; p++) pages.add(p);
  }
  return [...pages].sort((x, y) => x - y);
}
