// Resize PDF: put every page onto a new page size, scaled to fit without
// stretching. Uses pdf-lib (loaded only when needed). Text stays as text.
import { describePdfError } from "@/lib/mergePdf";

export type SizeChoice = "a4" | "a3" | "a5" | "letter" | "legal" | "custom";
export type Orientation = "auto" | "portrait" | "landscape";
export type Margin = "none" | "small" | "large";
export type Unit = "mm" | "in";

export type ResizeSettings = {
  size: SizeChoice;
  orientation: Orientation;
  margin: Margin;
  customWidth: number; // in `unit`
  customHeight: number;
  unit: Unit;
};

type Dim = { width: number; height: number };

// Sizes in points (72 pt = 1 inch), portrait
export const PAGE_SIZES: Record<Exclude<SizeChoice, "custom">, Dim & { label: string }> = {
  a4: { width: 595.28, height: 841.89, label: "A4" },
  a3: { width: 841.89, height: 1190.55, label: "A3" },
  a5: { width: 419.53, height: 595.28, label: "A5" },
  letter: { width: 612, height: 792, label: "Letter" },
  legal: { width: 612, height: 1008, label: "Legal" },
};

export const MARGIN_PT: Record<Margin, number> = { none: 0, small: 20, large: 40 };

export const toPt = (v: number, unit: Unit) => (unit === "mm" ? (v * 72) / 25.4 : v * 72);
export const ptToMm = (pt: number) => (pt * 25.4) / 72;

/** Name a page size like "A4" or "Letter" if it matches (either orientation). */
export function sizeName(d: Dim): string | null {
  const [a, b] = [Math.min(d.width, d.height), Math.max(d.width, d.height)];
  for (const s of Object.values(PAGE_SIZES)) {
    if (Math.abs(s.width - a) < 3 && Math.abs(s.height - b) < 3) return s.label;
  }
  return null;
}

export function describeSize(d: Dim): string {
  const name = sizeName(d);
  const mm = `${Math.round(ptToMm(d.width))} × ${Math.round(ptToMm(d.height))} mm`;
  return name ? `${name} (${mm})` : mm;
}

export type Fit = {
  pageWidth: number;
  pageHeight: number;
  x: number; // box of the shrunk/enlarged page content, from bottom-left
  y: number;
  width: number;
  height: number;
};

/** Target page size for one source page (src = size as displayed, rotation applied). */
export function computeFit(src: Dim, s: ResizeSettings): Fit | null {
  let base: Dim;
  if (s.size === "custom") {
    const w = toPt(s.customWidth, s.unit);
    const h = toPt(s.customHeight, s.unit);
    if (!(w >= 36 && h >= 36 && w <= 14400 && h <= 14400)) return null; // 0.5 in to 200 in
    base = { width: Math.min(w, h), height: Math.max(w, h) };
    if (s.orientation === "auto" && w > h) base = { width: w, height: h };
  } else {
    base = PAGE_SIZES[s.size];
  }

  const srcLandscape = src.width > src.height;
  const landscape =
    s.orientation === "landscape" ||
    (s.orientation === "auto" && (s.size === "custom" ? base.width > base.height : srcLandscape));
  const pageWidth = landscape ? Math.max(base.width, base.height) : Math.min(base.width, base.height);
  const pageHeight = landscape ? Math.min(base.width, base.height) : Math.max(base.width, base.height);

  const m = MARGIN_PT[s.margin];
  const availW = pageWidth - 2 * m;
  const availH = pageHeight - 2 * m;
  if (availW <= 0 || availH <= 0) return null;
  const scale = Math.min(availW / src.width, availH / src.height);
  const width = src.width * scale;
  const height = src.height * scale;
  return { pageWidth, pageHeight, x: (pageWidth - width) / 2, y: (pageHeight - height) / 2, width, height };
}

function normaliseRotation(deg: number) {
  return (((Math.round(deg / 90) * 90) % 360) + 360) % 360;
}

/** Page count and the displayed size of page 1. */
export async function readPdfInfo(file: File): Promise<{ pageCount: number; firstPage: Dim }> {
  const { PDFDocument } = await import("pdf-lib");
  let doc;
  try {
    doc = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
  } catch (e) {
    throw new Error(`This PDF ${describePdfError(e)}`);
  }
  const page = doc.getPage(0);
  const box = page.getCropBox();
  const rot = normaliseRotation(page.getRotation().angle);
  const firstPage = rot % 180 === 0 ? { width: box.width, height: box.height } : { width: box.height, height: box.width };
  return { pageCount: doc.getPageCount(), firstPage };
}

export async function resizePdf(
  file: File,
  settings: ResizeSettings,
  title: string,
  onProgress: (done: number, total: number) => void,
  isCancelled: () => boolean,
): Promise<{ blob: Blob; pageCount: number } | null> {
  const { PDFDocument, degrees } = await import("pdf-lib");
  let src;
  try {
    src = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
  } catch (e) {
    throw new Error(`This PDF ${describePdfError(e)}`);
  }

  const out = await PDFDocument.create();
  out.setTitle(title);
  out.setCreator("PDFConvertly");
  out.setProducer("PDFConvertly (pdf-lib)");

  const pages = src.getPages();
  for (let i = 0; i < pages.length; i++) {
    if (isCancelled()) return null;
    onProgress(i, pages.length);
    if (i % 5 === 0) await new Promise((r) => setTimeout(r, 0)); // keep the page responsive

    const srcPage = pages[i];
    const crop = srcPage.getCropBox(); // the visible area of the page
    const rot = normaliseRotation(srcPage.getRotation().angle);
    const display = rot % 180 === 0 ? { width: crop.width, height: crop.height } : { width: crop.height, height: crop.width };

    const fit = computeFit(display, settings);
    if (!fit) throw new Error("Please enter a valid custom page size.");

    const embedded = await out.embedPage(srcPage, {
      left: crop.x,
      bottom: crop.y,
      right: crop.x + crop.width,
      top: crop.y + crop.height,
    });

    // Size of the content before rotation
    const s = fit.width / display.width;
    const sw = crop.width * s;
    const sh = crop.height * s;

    // Pages with a /Rotate setting are drawn rotated so they look the same as before
    let x = fit.x;
    let y = fit.y;
    if (rot === 90) y = fit.y + sw;
    else if (rot === 180) {
      x = fit.x + sw;
      y = fit.y + sh;
    } else if (rot === 270) x = fit.x + sh;

    const page = out.addPage([fit.pageWidth, fit.pageHeight]);
    page.drawPage(embedded, { x, y, width: sw, height: sh, rotate: degrees(-rot) });
  }

  onProgress(pages.length, pages.length);
  const bytes = await out.save({ useObjectStreams: true });
  return {
    blob: new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
    pageCount: out.getPageCount(),
  };
}
