// Passport / exam photo maker: crop to an exact size, adjust brightness,
// hit a KB limit, and lay out copies on a print sheet. Runs in the browser.
import type { CropRect } from "@/lib/image";

export type PhotoSize =
  | { unit: "mm"; w: number; h: number } // printed photos, made at 300 DPI
  | { unit: "px"; w: number; h: number }; // online forms ask for exact pixels

export type Preset = { id: string; label: string; note: string; size: PhotoSize | null };

export const PRESETS: Preset[] = [
  { id: "passport", label: "Passport size", note: "3.5 × 4.5 cm", size: { unit: "mm", w: 35, h: 45 } },
  { id: "us", label: "US visa", note: "2 × 2 in", size: { unit: "mm", w: 51, h: 51 } },
  { id: "stamp", label: "Stamp size", note: "2 × 2.5 cm", size: { unit: "mm", w: 20, h: 25 } },
  { id: "form", label: "Online form", note: "pixels and KB", size: null },
];

export const PRINT_DPI = 300;
const PT_PER_MM = 72 / 25.4;

export type Paper = "4x6" | "a4";
export const PAPERS: Record<Paper, { label: string; w: number; h: number; margin: number }> = {
  "4x6": { label: "4 × 6 in photo paper", w: 101.6, h: 152.4, margin: 3 },
  a4: { label: "A4", w: 210, h: 297, margin: 10 },
};
const SHEET_GAP = 2; // mm between photos

/** Pixel size of the finished photo. */
export function outputPixels(size: PhotoSize) {
  if (size.unit === "px") return { w: Math.round(size.w), h: Math.round(size.h) };
  return { w: Math.round((size.w / 25.4) * PRINT_DPI), h: Math.round((size.h / 25.4) * PRINT_DPI) };
}

export function aspectOf(size: PhotoSize) {
  return size.w / size.h;
}

export type Adjust = { brightness: number; contrast: number }; // -50 … +50

/** Draw the cropped photo at its final pixel size, with brightness/contrast applied. */
export function renderPhoto(source: CanvasImageSource, crop: CropRect, w: number, h: number, adjust: Adjust) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas is not available in this browser.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height);

  if (adjust.brightness !== 0 || adjust.contrast !== 0) {
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;
    const b = adjust.brightness * 2.55; // up to ±127
    const c = (adjust.contrast / 100) * 255;
    const f = (259 * (c + 255)) / (255 * (259 - c));
    for (let i = 0; i < d.length; i += 4) {
      d[i] = f * (d[i] - 128) + 128 + b;
      d[i + 1] = f * (d[i + 1] - 128) + 128 + b;
      d[i + 2] = f * (d[i + 2] - 128) + 128 + b;
    }
    ctx.putImageData(img, 0, 0); // values are clamped to 0–255 automatically
  }
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("could not save the image."))), type, quality),
  );
}

/**
 * Save as JPG. With maxKB, find the best quality under the limit while
 * keeping the exact pixel size (forms check both).
 */
export async function encodePhoto(canvas: HTMLCanvasElement, maxKB?: number) {
  if (!maxKB) return { blob: await toBlob(canvas, "image/jpeg", 0.92), reached: true };
  const limit = maxKB * 1024;
  const top = await toBlob(canvas, "image/jpeg", 0.92);
  if (top.size <= limit) return { blob: top, reached: true };

  let lo = 0.2;
  let hi = 0.92;
  let best: Blob | null = null;
  for (let i = 0; i < 8; i++) {
    const q = (lo + hi) / 2;
    const b = await toBlob(canvas, "image/jpeg", q);
    if (b.size <= limit) {
      best = b;
      lo = q;
    } else {
      hi = q;
    }
  }
  if (best) return { blob: best, reached: true };
  return { blob: await toBlob(canvas, "image/jpeg", 0.2), reached: false };
}

/** How many photos fit on the paper, trying both orientations. Positions are mm from the top-left. */
export function sheetLayout(photo: { w: number; h: number }, paper: Paper, copies: number) {
  const p = PAPERS[paper];
  const fit = (pw: number, ph: number) => {
    const cols = Math.floor((pw - 2 * p.margin + SHEET_GAP) / (photo.w + SHEET_GAP));
    const rows = Math.floor((ph - 2 * p.margin + SHEET_GAP) / (photo.h + SHEET_GAP));
    return { cols: Math.max(0, cols), rows: Math.max(0, rows), pw, ph };
  };
  const portrait = fit(p.w, p.h);
  const landscape = fit(p.h, p.w);
  const best = landscape.cols * landscape.rows > portrait.cols * portrait.rows ? landscape : portrait;
  const max = best.cols * best.rows;
  const n = Math.min(Math.max(1, copies), max);
  const gridW = Math.min(n, best.cols) * (photo.w + SHEET_GAP) - SHEET_GAP;
  const left = (best.pw - gridW) / 2;
  const positions = Array.from({ length: max === 0 ? 0 : n }, (_, i) => ({
    x: left + (i % best.cols) * (photo.w + SHEET_GAP),
    y: p.margin + Math.floor(i / best.cols) * (photo.h + SHEET_GAP),
  }));
  return { pageW: best.pw, pageH: best.ph, max, positions };
}

/** Print sheet as a PDF: each photo placed at its exact size. */
export async function buildSheetPdf(photo: Blob, size: { w: number; h: number }, paper: Paper, copies: number, cutLines: boolean) {
  const { PDFDocument, rgb } = await import("pdf-lib");
  const layout = sheetLayout(size, paper, copies);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([layout.pageW * PT_PER_MM, layout.pageH * PT_PER_MM]);
  const img = await pdf.embedJpg(new Uint8Array(await photo.arrayBuffer()));
  for (const pos of layout.positions) {
    const box = {
      x: pos.x * PT_PER_MM,
      y: page.getHeight() - (pos.y + size.h) * PT_PER_MM,
      width: size.w * PT_PER_MM,
      height: size.h * PT_PER_MM,
    };
    page.drawImage(img, box);
    if (cutLines) page.drawRectangle({ ...box, borderColor: rgb(0.65, 0.65, 0.65), borderWidth: 0.4 });
  }
  pdf.setTitle("Photo sheet");
  pdf.setProducer("PDF Suite");
  return new Blob([new Uint8Array(await pdf.save())], { type: "application/pdf" });
}

/** Print sheet as a 300 DPI JPG (for photo studios and phone printing apps). */
export async function buildSheetJpg(photo: HTMLCanvasElement, size: { w: number; h: number }, paper: Paper, copies: number, cutLines: boolean, dpi = PRINT_DPI) {
  const layout = sheetLayout(size, paper, copies);
  const px = dpi / 25.4;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(layout.pageW * px);
  canvas.height = Math.round(layout.pageH * px);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas is not available in this browser.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  for (const pos of layout.positions) {
    ctx.drawImage(photo, pos.x * px, pos.y * px, size.w * px, size.h * px);
    if (cutLines) {
      ctx.strokeStyle = "#a6a6a6";
      ctx.lineWidth = Math.max(1, dpi / 200);
      ctx.strokeRect(pos.x * px, pos.y * px, size.w * px, size.h * px);
    }
  }
  return canvas;
}

export async function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.92) {
  return toBlob(canvas, "image/jpeg", quality);
}
