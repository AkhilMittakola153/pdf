// ID card print: put the front and back of a card (Aadhaar, PAN, voter ID,
// driving licence…) on one A4 page at real size. Everything runs in the browser.
import { MAX_CANVAS_AREA, type CropRect } from "@/lib/image";

export type Rect = { x: number; y: number; w: number; h: number };
export type Side = "front" | "back";
export type CardShape = "landscape" | "portrait";
export type Arrangement = "side" | "stacked";

/** Standard ID card size (ISO ID-1, same as a bank card), in mm. */
export const CARD_MM = { w: 85.6, h: 54 };
const A4_MM = { w: 210, h: 297 };
const MARGIN = 15; // page margin, mm
const PAIR_GAP = 8; // between front and back, mm
const SET_GAP = 12; // between copies, mm
const PT_PER_MM = 72 / 25.4;
const CARD_DPI = 300; // print quality for each card image
const MAX_SOURCE = 2600; // photos are reduced to this many pixels on the long side

export function cardSizeMm(shape: CardShape) {
  return shape === "landscape" ? { w: CARD_MM.w, h: CARD_MM.h } : { w: CARD_MM.h, h: CARD_MM.w };
}

/** Width ÷ height of the card, for the crop box. */
export function cardAspect(shape: CardShape) {
  const s = cardSizeMm(shape);
  return s.w / s.h;
}

/**
 * Where each card goes on the A4 page (mm from the top-left corner).
 * Returns null if that many copies don't fit.
 */
export function layoutCards(shape: CardShape, arrangement: Arrangement, copies: number, hasBack: boolean) {
  const c = cardSizeMm(shape);
  const setW = hasBack && arrangement === "side" ? 2 * c.w + PAIR_GAP : c.w;
  const setH = hasBack && arrangement === "stacked" ? 2 * c.h + PAIR_GAP : c.h;
  const usableW = A4_MM.w - 2 * MARGIN;
  const usableH = A4_MM.h - 2 * MARGIN;

  const maxCols = Math.max(1, Math.floor((usableW + SET_GAP) / (setW + SET_GAP)));
  const cols = Math.min(maxCols, copies);
  const rows = Math.ceil(copies / cols);
  if (rows * setH + (rows - 1) * SET_GAP > usableH + 0.01) return null;

  const gridW = cols * setW + (cols - 1) * SET_GAP;
  const left = (A4_MM.w - gridW) / 2;
  const out: { side: Side; rect: Rect }[] = [];
  for (let i = 0; i < copies; i++) {
    const x = left + (i % cols) * (setW + SET_GAP);
    const y = MARGIN + Math.floor(i / cols) * (setH + SET_GAP);
    out.push({ side: "front", rect: { x, y, w: c.w, h: c.h } });
    if (hasBack) {
      const bx = arrangement === "side" ? x + c.w + PAIR_GAP : x;
      const by = arrangement === "stacked" ? y + c.h + PAIR_GAP : y;
      out.push({ side: "back", rect: { x: bx, y: by, w: c.w, h: c.h } });
    }
  }
  return out;
}

/** Copy counts that fit for these settings. */
export function copyOptions(shape: CardShape, arrangement: Arrangement, hasBack: boolean) {
  return [1, 2, 4].filter((n) => layoutCards(shape, arrangement, n, hasBack) !== null);
}

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas is not available in this browser.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return { canvas, ctx };
}

/**
 * Load a photo (phone rotation applied) and reduce it to a workable size.
 * Pass `fill: null` to keep transparency (PNG/WebP).
 */
export async function loadImageSource(
  blob: Blob,
  maxSide = MAX_SOURCE,
  fill: string | null = "#ffffff",
  maxArea = MAX_CANVAS_AREA,
): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(blob);
  try {
    const s = Math.min(1, maxSide / Math.max(bmp.width, bmp.height), Math.sqrt(maxArea / (bmp.width * bmp.height)));
    const { canvas, ctx } = makeCanvas(bmp.width * s, bmp.height * s);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    bmp.close();
  }
}

/** Rotate by quarter turns plus a small straightening angle (degrees). Corners are filled white. */
export function rotateSource(base: HTMLCanvasElement, quarter: number, fine: number, fill: string | null = "#ffffff"): HTMLCanvasElement {
  const deg = (((quarter % 4) + 4) % 4) * 90 + fine;
  if (deg === 0) return base;
  const rad = (deg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const w = base.width * cos + base.height * sin;
  const h = base.width * sin + base.height * cos;
  const { canvas, ctx } = makeCanvas(w, h);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(base, -base.width / 2, -base.height / 2);
  return canvas;
}

/** A card-shaped crop box covering most of the image, centred. */
export function defaultCrop(src: { width: number; height: number }, aspect: number, area?: Rect): CropRect {
  const a = area ?? { x: 0, y: 0, w: src.width, h: src.height };
  let w = a.w * 0.9;
  let h = w / aspect;
  if (h > a.h * 0.9) {
    h = a.h * 0.9;
    w = h * aspect;
  }
  return { x: a.x + (a.w - w) / 2, y: a.y + (a.h - h) / 2, w, h };
}

/** Keep a crop box inside the image (used after straightening changes the size). */
export function clampCrop(c: CropRect, src: { width: number; height: number }): CropRect {
  const w = Math.min(c.w, src.width);
  const h = Math.min(c.h, src.height);
  return {
    w,
    h,
    x: Math.min(Math.max(0, c.x), src.width - w),
    y: Math.min(Math.max(0, c.y), src.height - h),
  };
}

export type CardInput = {
  source: HTMLCanvasElement; // already rotated
  crop: CropRect; // pixels in source
  masks: Rect[]; // 0–1 fractions of the card
};

/** Draw one card: crop, cover boxes and optional black-and-white. */
export function renderCard(input: CardInput, shape: CardShape, grayscale: boolean, dpi = CARD_DPI) {
  const mm = cardSizeMm(shape);
  const { canvas, ctx } = makeCanvas((mm.w / 25.4) * dpi, (mm.h / 25.4) * dpi);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const { crop } = input;
  ctx.drawImage(input.source, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000000";
  for (const m of input.masks) {
    ctx.fillRect(m.x * canvas.width, m.y * canvas.height, m.w * canvas.width, m.h * canvas.height);
  }
  if (grayscale) {
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = d[i + 1] = d[i + 2] = g;
    }
    ctx.putImageData(img, 0, 0);
  }
  return canvas;
}

export type PageSettings = {
  shape: CardShape;
  arrangement: Arrangement;
  copies: number;
  grayscale: boolean;
  cutLines: boolean;
};

function placements(cards: { front: CardInput; back: CardInput | null }, s: PageSettings) {
  const layout = layoutCards(s.shape, s.arrangement, s.copies, cards.back !== null);
  if (!layout) throw new Error("That many copies don't fit on one page.");
  return layout;
}

/** Draw the whole A4 page on a canvas (for the preview and JPG download). */
export function composePage(cards: { front: CardInput; back: CardInput | null }, s: PageSettings, dpi: number) {
  const layout = placements(cards, s);
  const px = dpi / 25.4;
  const { canvas, ctx } = makeCanvas(A4_MM.w * px, A4_MM.h * px);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cardDpi = Math.min(CARD_DPI, dpi);
  const rendered = {
    front: renderCard(cards.front, s.shape, s.grayscale, cardDpi),
    back: cards.back ? renderCard(cards.back, s.shape, s.grayscale, cardDpi) : null,
  };
  for (const { side, rect } of layout) {
    const img = rendered[side];
    if (!img) continue;
    ctx.drawImage(img, rect.x * px, rect.y * px, rect.w * px, rect.h * px);
    if (s.cutLines) {
      ctx.save();
      ctx.strokeStyle = "#9ca3af";
      ctx.lineWidth = Math.max(1, dpi / 150);
      ctx.setLineDash([dpi / 25, dpi / 25]);
      ctx.strokeRect(rect.x * px, rect.y * px, rect.w * px, rect.h * px);
      ctx.restore();
    }
  }
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("could not save the image."))), type, quality),
  );
}

/** A4 JPG at 200 DPI: fine for WhatsApp and most printers. */
export async function buildJpg(cards: { front: CardInput; back: CardInput | null }, s: PageSettings) {
  const canvas = composePage(cards, s, 200);
  const blob = await toBlob(canvas, "image/jpeg", 0.92);
  canvas.width = canvas.height = 0;
  return blob;
}

/** A4 PDF with each card embedded at 300 DPI and placed at exact real size. */
export async function buildPdf(cards: { front: CardInput; back: CardInput | null }, s: PageSettings) {
  const { PDFDocument, rgb } = await import("pdf-lib");
  const layout = placements(cards, s);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([A4_MM.w * PT_PER_MM, A4_MM.h * PT_PER_MM]);
  const pageH = page.getHeight();

  const embedded: Partial<Record<Side, Awaited<ReturnType<typeof pdf.embedJpg>>>> = {};
  for (const side of ["front", "back"] as const) {
    const input = cards[side];
    if (!input) continue;
    const canvas = renderCard(input, s.shape, s.grayscale);
    const blob = await toBlob(canvas, "image/jpeg", 0.92);
    canvas.width = canvas.height = 0;
    embedded[side] = await pdf.embedJpg(new Uint8Array(await blob.arrayBuffer()));
  }

  for (const { side, rect } of layout) {
    const img = embedded[side];
    if (!img) continue;
    const box = {
      x: rect.x * PT_PER_MM,
      y: pageH - (rect.y + rect.h) * PT_PER_MM,
      width: rect.w * PT_PER_MM,
      height: rect.h * PT_PER_MM,
    };
    page.drawImage(img, box);
    if (s.cutLines) {
      page.drawRectangle({ ...box, borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 0.5, borderDashArray: [3, 3] });
    }
  }
  pdf.setTitle("ID card print");
  pdf.setProducer("PDF Suite");
  const bytes = await pdf.save();
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}
