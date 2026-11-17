// Add a text watermark to PDF pages with pdf-lib.
// The text is drawn into each page, centred or tiled, and stays upright
// on rotated pages.
import { describePdfError } from "@/lib/mergePdf";
import { SITE } from "@/lib/site";

export type WmLayout = "center" | "tiled";
export type WmAngle = "diagonal" | "horizontal";
export type WmSize = "small" | "medium" | "large";

export type WatermarkOptions = {
  text: string;
  layout: WmLayout;
  angle: WmAngle;
  size: WmSize;
  opacity: number; // 0–1
  color: string; // hex
  pages: number[] | null; // null = all pages
};

/** How wide the text is, as a share of the page (diagonal or width). Also used by the preview. */
export const SIZE_FRACTION: Record<WmSize, number> = { small: 0.35, medium: 0.55, large: 0.8 };
export const TILE_FACTOR = 0.45; // tiles are smaller than a single centred stamp

const norm = (deg: number) => (((Math.round(deg / 90) * 90) % 360) + 360) % 360;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

export async function addWatermark(
  file: File,
  o: WatermarkOptions,
  onProgress: (done: number, total: number) => void,
  isCancelled: () => boolean,
): Promise<Blob | null> {
  const { PDFDocument, StandardFonts, rgb, degrees } = await import("pdf-lib");
  let doc;
  try {
    doc = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
  } catch (e) {
    throw new Error(`This PDF ${describePdfError(e)}`);
  }

  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const supported = new Set(font.getCharacterSet());
  const bad = [...new Set([...o.text].filter((ch) => !supported.has(ch.codePointAt(0)!)))];
  if (bad.length) {
    throw new Error(`These characters can't be used yet: ${bad.join(" ")}. Please use English letters, numbers and common symbols.`);
  }

  const c = hexToRgb(o.color);
  const color = rgb(c.r, c.g, c.b);
  const unit = font.widthOfTextAtSize(o.text, 1); // text width at size 1
  const pages = doc.getPages();
  const targets = o.pages ?? pages.map((_, i) => i + 1);
  const alpha = o.angle === "diagonal" ? 45 : 0; // angle as the reader sees it

  for (let i = 0; i < targets.length; i++) {
    if (isCancelled()) return null;
    onProgress(i, targets.length);
    if (i % 10 === 0) await new Promise((r) => setTimeout(r, 0));

    const page = pages[targets[i] - 1];
    if (!page) continue;
    const box = page.getCropBox();
    const rot = norm(page.getRotation().angle);
    const dispW = rot % 180 ? box.height : box.width;
    const dispH = rot % 180 ? box.width : box.height;
    const theta = alpha + rot; // add the page's own rotation so the text looks right
    const cos = Math.cos((theta * Math.PI) / 180);
    const sin = Math.sin((theta * Math.PI) / 180);
    const mx = box.x + box.width / 2;
    const my = box.y + box.height / 2;

    let size: number;
    const draw = (cx: number, cy: number) => {
      const w = unit * size;
      const ch = size * 0.35; // vertical centre of capital letters
      page.drawText(o.text, {
        x: cx - ((w / 2) * cos - ch * sin),
        y: cy - ((w / 2) * sin + ch * cos),
        size,
        font,
        color,
        opacity: o.opacity,
        rotate: degrees(theta),
      });
    };

    if (o.layout === "center") {
      const span = alpha ? Math.hypot(dispW, dispH) : dispW;
      size = clamp((span * SIZE_FRACTION[o.size]) / unit, 8, 300);
      draw(mx, my);
    } else {
      size = clamp((Math.min(dispW, dispH) * SIZE_FRACTION[o.size] * TILE_FACTOR) / unit, 6, 120);
      const w = unit * size;
      const stepX = w + size * 3;
      const stepY = size * 5;
      const R = Math.hypot(box.width, box.height) / 2 + w;
      let row = 0;
      for (let v = -R; v <= R; v += stepY, row++) {
        for (let u = -R + (row % 2 ? stepX / 2 : 0); u <= R; u += stepX) {
          const cx = mx + u * cos - v * sin;
          const cy = my + u * sin + v * cos;
          if (cx < box.x - w || cx > box.x + box.width + w || cy < box.y - w || cy > box.y + box.height + w) continue;
          draw(cx, cy);
        }
      }
    }
  }

  onProgress(targets.length, targets.length);
  doc.setProducer(`${SITE.name} (pdf-lib)`);
  const bytes = await doc.save({ useObjectStreams: true });
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}
