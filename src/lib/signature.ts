// Signature cleaner: turn a phone photo of a signature into clean ink on a
// transparent or white background. Uses adaptive thresholding, so shadows and
// uneven light on the paper don't turn grey. Runs in the browser.
import type { CropRect } from "@/lib/image";

export type InkColour = "black" | "blue";
export type CleanOptions = {
  sensitivity: number; // 0–100: higher picks up lighter strokes (and more paper noise)
  ink: InkColour;
  removeSpecks: boolean;
};

const WORK_MAX = 1600; // process at most this many pixels on the long side
const INK_RGB: Record<InkColour, [number, number, number]> = {
  black: [17, 17, 17],
  blue: [20, 48, 140],
};

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas is not available in this browser.");
  return { canvas, ctx };
}

/**
 * Returns a tightly trimmed canvas with the signature in ink colour on a
 * transparent background. Throws if no ink is found.
 */
export function cleanSignature(source: CanvasImageSource, crop: CropRect, opt: CleanOptions): HTMLCanvasElement {
  const s = Math.min(1, WORK_MAX / Math.max(crop.w, crop.h));
  const { canvas: work, ctx } = makeCanvas(crop.w * s, crop.h * s);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, work.width, work.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, work.width, work.height);
  const W = work.width;
  const H = work.height;
  const px = ctx.getImageData(0, 0, W, H).data;

  const alpha = inkAlpha(px, W, H, opt.sensitivity, opt.removeSpecks);

  // Trim to the ink, with a little padding
  let minX = W;
  let minY = H;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (alpha[y * W + x] > 0.3) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error("No signature found. Move the box over the signature, or raise Ink detection.");
  const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.04) + 2;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(W - 1, maxX + pad);
  maxY = Math.min(H - 1, maxY + pad);

  const ow = maxX - minX + 1;
  const oh = maxY - minY + 1;
  const { canvas: out, ctx: octx } = makeCanvas(ow, oh);
  const img = octx.createImageData(ow, oh);
  const [ir, ig, ib] = INK_RGB[opt.ink];
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      const a = alpha[(y + minY) * W + (x + minX)];
      const o = (y * ow + x) * 4;
      img.data[o] = ir;
      img.data[o + 1] = ig;
      img.data[o + 2] = ib;
      img.data[o + 3] = Math.round(a * 255);
    }
  }
  octx.putImageData(img, 0, 0);
  work.width = work.height = 0;
  return out;
}

/** Place the signature on white at an exact pixel size (for forms), centred with a small margin. */
export function signatureOnWhite(sig: HTMLCanvasElement, w?: number, h?: number) {
  const W = Math.round(w ?? sig.width);
  const H = Math.round(h ?? sig.height);
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  const margin = w || h ? 0.06 : 0;
  const s = Math.min((W * (1 - 2 * margin)) / sig.width, (H * (1 - 2 * margin)) / sig.height);
  const dw = sig.width * s;
  const dh = sig.height * s;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(sig, (W - dw) / 2, (H - dh) / 2, dw, dh);
  return canvas;
}

/** Ink strength (0–1) of every pixel. Pure function, so it can be tested without a browser. */
export function inkAlpha(px: Uint8ClampedArray, W: number, H: number, sensitivity: number, removeSpecks: boolean) {
  // Brightness of each pixel, and a summed-area table for fast local averages
  const gray = new Float32Array(W * H);
  const sum = new Float64Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) {
    let row = 0;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      gray[y * W + x] = g;
      row += g;
      sum[(y + 1) * (W + 1) + x + 1] = sum[y * (W + 1) + x + 1] + row;
    }
  }

  // A pixel is ink if it is clearly darker than the paper around it
  const r = Math.min(80, Math.max(10, Math.round(Math.max(W, H) / 16)));
  const k = 0.3 - (Math.min(100, Math.max(0, sensitivity)) / 100) * 0.25; // 0.30 … 0.05
  const alpha = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(H, y + r + 1);
    for (let x = 0; x < W; x++) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(W, x + r + 1);
      const area = (x1 - x0) * (y1 - y0);
      const total = sum[y1 * (W + 1) + x1] - sum[y0 * (W + 1) + x1] - sum[y1 * (W + 1) + x0] + sum[y0 * (W + 1) + x0];
      const t = (total / area) * (1 - k);
      const g = gray[y * W + x];
      // Soft edge instead of a hard cut, so strokes stay smooth
      alpha[y * W + x] = Math.min(1, Math.max(0, (t - g) / (t * 0.12 + 1)));
    }
  }

  if (removeSpecks) {
    const keep = new Float32Array(alpha);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (alpha[y * W + x] === 0) continue;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const xx = x + dx;
            const yy = y + dy;
            if (xx >= 0 && yy >= 0 && xx < W && yy < H && alpha[yy * W + xx] > 0.5) n++;
          }
        }
        if (n <= 1) keep[y * W + x] = 0;
      }
    }
    alpha.set(keep);
  }

  return alpha;
}
