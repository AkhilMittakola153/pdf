// Compress images in the browser with the Canvas API.
// "Target size" mode finds the best quality that fits under a size (e.g. 100 KB),
// and only shrinks the pixel dimensions if lowering quality alone is not enough.
import { MAX_CANVAS_AREA } from "@/lib/image";

export type CompressFormat = "image/jpeg" | "image/webp";

export type CompressOptions =
  | { mode: "target"; targetKB: number; format: CompressFormat }
  | { mode: "quality"; quality: number; format: CompressFormat }; // quality 1–100

export type CompressedImage = {
  blob: Blob;
  width: number;
  height: number;
  reachedTarget: boolean; // always true in quality mode
  keptOriginal: boolean; // the original was already small enough
  formatFallback: boolean; // browser couldn't save WebP, used JPG instead
};

const MIN_SIDE = 120; // never shrink below this (keeps images recognisable)
const Q_MIN = 0.35;
const Q_MAX = 0.92;

function draw(bmp: ImageBitmap, w: number, h: number, type: string) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas is not available in this browser.");
  if (type === "image/jpeg") {
    ctx.fillStyle = "#ffffff"; // JPG has no transparency
    ctx.fillRect(0, 0, w, h);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, w, h);
  return canvas;
}

function encode(canvas: HTMLCanvasElement, type: string, q: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("could not save the image."))), type, q),
  );
}

export async function compressImage(file: File, opts: CompressOptions): Promise<CompressedImage> {
  const bmp = await createImageBitmap(file); // also applies phone rotation
  try {
    let w = bmp.width;
    let h = bmp.height;
    if (w * h > MAX_CANVAS_AREA) {
      const s = Math.sqrt(MAX_CANVAS_AREA / (w * h));
      w = Math.floor(w * s);
      h = Math.floor(h * s);
    }

    // Check the browser can really save the chosen format (older Safari can't do WebP)
    let type: string = opts.format;
    let formatFallback = false;
    {
      const probe = draw(bmp, 1, 1, type);
      const test = await encode(probe, type, 0.8);
      if (test.type !== type) {
        type = "image/jpeg";
        formatFallback = true;
      }
    }

    if (opts.mode === "quality") {
      const canvas = draw(bmp, w, h, type);
      const blob = await encode(canvas, type, opts.quality / 100);
      canvas.width = canvas.height = 0;
      return { blob, width: w, height: h, reachedTarget: true, keptOriginal: false, formatFallback };
    }

    const target = opts.targetKB * 1024;

    // Already small enough and already in the right format: keep it untouched
    if (file.size <= target && file.type === type && w === bmp.width) {
      return { blob: file, width: w, height: h, reachedTarget: true, keptOriginal: true, formatFallback };
    }

    let smallest: { blob: Blob; w: number; h: number } | null = null;

    for (let round = 0; round < 8; round++) {
      const canvas = draw(bmp, w, h, type);
      try {
        const high = await encode(canvas, type, Q_MAX);
        if (high.size <= target) return { blob: high, width: w, height: h, reachedTarget: true, keptOriginal: false, formatFallback };

        const low = await encode(canvas, type, Q_MIN);
        if (!smallest || low.size < smallest.blob.size) smallest = { blob: low, w, h };

        if (low.size <= target) {
          // Binary search for the highest quality that still fits
          let lo = Q_MIN;
          let hi = Q_MAX;
          let best = low;
          for (let i = 0; i < 7; i++) {
            const mid = (lo + hi) / 2;
            const b = await encode(canvas, type, mid);
            if (b.size <= target) {
              best = b;
              lo = mid;
            } else {
              hi = mid;
            }
          }
          return { blob: best, width: w, height: h, reachedTarget: true, keptOriginal: false, formatFallback };
        }

        // Even the lowest quality is too big: make the image smaller and try again
        const factor = Math.max(0.5, Math.min(0.9, Math.sqrt(target / low.size) * 0.95));
        const nw = Math.round(w * factor);
        const nh = Math.round(h * factor);
        if (Math.min(nw, nh) < MIN_SIDE) break;
        w = nw;
        h = nh;
      } finally {
        canvas.width = canvas.height = 0;
      }
    }

    // Couldn't reach the target: return the smallest version found
    const s = smallest!;
    return { blob: s.blob, width: s.w, height: s.h, reachedTarget: false, keptOriginal: false, formatFallback };
  } finally {
    bmp.close();
  }
}
