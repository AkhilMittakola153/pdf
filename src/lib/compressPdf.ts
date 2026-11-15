// Compress PDF in the browser.
//
// Balanced / Strong: finds the JPEG photos inside the PDF, shrinks and
// re-saves them at lower quality, and puts them back. Text, vector drawings
// and fonts are not touched, so text stays sharp and selectable.
//
// Maximum: redraws every page as a JPEG image (like a scan). Always works on
// scanned PDFs, but the text can no longer be selected or searched.
import type { PDFDict, PDFObject, PDFRawStream as RawStream } from "pdf-lib";
import { describePdfError } from "@/lib/mergePdf";
import { openPdf, renderPage, describePdfjsError } from "@/lib/pdfRender";
import { SITE } from "@/lib/site";

export type Level = "balanced" | "strong" | "maximum";

export const LEVELS: Record<Level, { label: string; description: string; keepsText: boolean }> = {
  balanced: {
    label: "Balanced",
    description: "Good quality, smaller file. Best for most documents.",
    keepsText: true,
  },
  strong: {
    label: "Strong",
    description: "Smaller file, images look softer. Good for email limits.",
    keepsText: true,
  },
  maximum: {
    label: "Maximum",
    description: "Smallest file. Every page becomes an image, like a scan.",
    keepsText: false,
  },
};

// Image settings per level: longest side in pixels and JPEG quality (0–1)
const IMAGE_SETTINGS = {
  balanced: { maxSide: 2000, quality: 0.72 },
  strong: { maxSide: 1400, quality: 0.55 },
};
const RASTER = { dpi: 110, quality: 0.6 };

const MIN_PIXELS = 40_000; // skip tiny images such as icons (about 200 × 200)

export type CompressResult = { blob: Blob; imagesFound: number; imagesShrunk: number };

function toBlob(bytes: Uint8Array) {
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}

async function reencodeJpeg(bytes: Uint8Array, maxSide: number, quality: number): Promise<Uint8Array | null> {
  let bmp: ImageBitmap;
  try {
    // imageOrientation "none": PDFs ignore EXIF rotation, so we must too
    bmp = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }), {
      imageOrientation: "none",
    } as ImageBitmapOptions);
  } catch {
    return null; // a JPEG variant the browser can't decode: leave it as it is
  }
  try {
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    canvas.width = canvas.height = 0;
    return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
  } finally {
    bmp.close();
  }
}

/** Balanced / Strong: shrink the JPEG images inside the PDF. */
async function compressImages(
  file: File,
  level: "balanced" | "strong",
  onProgress: (done: number, total: number) => void,
  isCancelled: () => boolean,
): Promise<CompressResult | null> {
  const { PDFDocument, PDFName, PDFRawStream, PDFNumber, PDFArray } = await import("pdf-lib");
  const N = (n: string) => PDFName.of(n);

  let doc;
  try {
    doc = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
  } catch (e) {
    throw new Error(`This PDF ${describePdfError(e)}`);
  }
  const ctx = doc.context;

  const nameOf = (o: PDFObject | undefined) => (o instanceof PDFName ? o.toString() : "");

  // Number of colour channels: 1 (grey) or 3 (colour). 0 = skip (CMYK etc.)
  const channels = (cs: PDFObject | undefined): number => {
    const n = nameOf(cs);
    if (n === "/DeviceRGB" || n === "/CalRGB") return 3;
    if (n === "/DeviceGray" || n === "/CalGray") return 1;
    if (cs instanceof PDFArray && cs.size() >= 2 && nameOf(cs.lookup(0)) === "/ICCBased") {
      const profile = cs.lookup(1) as unknown as { dict?: PDFDict };
      const count = profile.dict?.lookup(N("N"));
      return count instanceof PDFNumber ? count.asNumber() : 0;
    }
    return 0;
  };

  const isPlainJpeg = (dict: PDFDict): boolean => {
    if (nameOf(dict.lookup(N("Subtype"))) !== "/Image") return false;
    const filter = dict.lookup(N("Filter"));
    const f = filter instanceof PDFArray ? (filter.size() === 1 ? nameOf(filter.lookup(0)) : "") : nameOf(filter);
    if (f !== "/DCTDecode") return false;
    if (dict.has(N("Decode")) || dict.has(N("ImageMask"))) return false;
    const c = channels(dict.lookup(N("ColorSpace")));
    if (c !== 1 && c !== 3) return false;
    const w = dict.lookup(N("Width"));
    const h = dict.lookup(N("Height"));
    return w instanceof PDFNumber && h instanceof PDFNumber && w.asNumber() * h.asNumber() >= MIN_PIXELS;
  };

  const images = ctx
    .enumerateIndirectObjects()
    .filter(([, obj]) => obj instanceof PDFRawStream && isPlainJpeg(obj.dict));

  const { maxSide, quality } = IMAGE_SETTINGS[level];
  let shrunk = 0;

  for (let i = 0; i < images.length; i++) {
    if (isCancelled()) return null;
    onProgress(i, images.length);
    await new Promise((r) => setTimeout(r, 0));

    const [ref, obj] = images[i];
    const stream = obj as RawStream;
    const original = stream.contents;
    const smaller = await reencodeJpeg(original, maxSide, quality);
    if (!smaller || smaller.length > original.length * 0.9) continue; // not worth it

    const bmpSize = await createImageBitmap(new Blob([new Uint8Array(smaller)], { type: "image/jpeg" }));
    const dict = stream.dict;
    dict.set(N("Width"), PDFNumber.of(bmpSize.width));
    dict.set(N("Height"), PDFNumber.of(bmpSize.height));
    bmpSize.close();
    dict.set(N("ColorSpace"), N("DeviceRGB"));
    dict.set(N("BitsPerComponent"), PDFNumber.of(8));
    dict.set(N("Filter"), N("DCTDecode"));
    dict.delete(N("DecodeParms"));
    dict.set(N("Length"), PDFNumber.of(smaller.length));
    ctx.assign(ref, PDFRawStream.of(dict, smaller));
    shrunk++;
  }

  onProgress(images.length, images.length);
  doc.setProducer(`${SITE.name} (pdf-lib)`);
  const bytes = await doc.save({ useObjectStreams: true }); // also packs the file structure tighter
  return { blob: toBlob(bytes), imagesFound: images.length, imagesShrunk: shrunk };
}

/** Maximum: redraw each page as a JPEG image. */
async function rasterize(
  file: File,
  onProgress: (done: number, total: number) => void,
  isCancelled: () => boolean,
): Promise<CompressResult | null> {
  const { PDFDocument } = await import("pdf-lib");
  let opened;
  try {
    opened = await openPdf(file);
  } catch (e) {
    throw new Error(describePdfjsError(e));
  }
  const { doc, close } = opened;
  try {
    const out = await PDFDocument.create();
    out.setCreator(SITE.name);
    out.setProducer(`${SITE.name} (pdf-lib)`);
    for (let p = 1; p <= doc.numPages; p++) {
      if (isCancelled()) return null;
      onProgress(p - 1, doc.numPages);
      const page = await doc.getPage(p);
      const vp = page.getViewport({ scale: 1 }); // page size in points
      const r = await renderPage(doc, p, RASTER.dpi / 72, "image/jpeg", RASTER.quality);
      const img = await out.embedJpg(await r.blob.arrayBuffer());
      out.addPage([vp.width, vp.height]).drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
    }
    onProgress(doc.numPages, doc.numPages);
    const bytes = await out.save({ useObjectStreams: true });
    return { blob: toBlob(bytes), imagesFound: doc.numPages, imagesShrunk: doc.numPages };
  } finally {
    await close();
  }
}

export function compressPdf(
  file: File,
  level: Level,
  onProgress: (done: number, total: number) => void,
  isCancelled: () => boolean,
): Promise<CompressResult | null> {
  return level === "maximum" ? rasterize(file, onProgress, isCancelled) : compressImages(file, level, onProgress, isCancelled);
}
