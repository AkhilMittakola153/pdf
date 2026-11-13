// Image to PDF: page layout maths (also used for the live preview) and
// PDF building with pdf-lib. pdf-lib is loaded only when a PDF is created.
import { detectFileKind } from "@/lib/files";
import { MAX_CANVAS_AREA, type Size } from "@/lib/image";

export type PageSizeChoice = "a4" | "letter" | "fit";
export type OrientationChoice = "auto" | "portrait" | "landscape";
export type MarginChoice = "none" | "small" | "large";

export type LayoutSettings = {
  pageSize: PageSizeChoice;
  orientation: OrientationChoice;
  margin: MarginChoice;
};

// PDF units are points: 72 points = 1 inch
const PAGE_SIZES: Record<"a4" | "letter", Size> = {
  a4: { width: 595.28, height: 841.89 }, // 210 × 297 mm
  letter: { width: 612, height: 792 }, // 8.5 × 11 in
};

export const MARGINS: Record<MarginChoice, number> = {
  none: 0,
  small: 20, // ≈ 7 mm
  large: 40, // ≈ 14 mm
};

const PX_TO_PT = 0.75; // 96 px per inch screen → 72 pt per inch

export type PageLayout = {
  pageWidth: number;
  pageHeight: number;
  x: number; // from left
  y: number; // from bottom (PDF convention)
  width: number;
  height: number;
};

/** Where one image sits on its page. Image is centred and never stretched. */
export function computeLayout(img: Size, s: LayoutSettings): PageLayout {
  const m = MARGINS[s.margin];

  if (s.pageSize === "fit") {
    const w = img.width * PX_TO_PT;
    const h = img.height * PX_TO_PT;
    return { pageWidth: w + 2 * m, pageHeight: h + 2 * m, x: m, y: m, width: w, height: h };
  }

  const base = PAGE_SIZES[s.pageSize];
  const landscape =
    s.orientation === "landscape" || (s.orientation === "auto" && img.width > img.height);
  const pageWidth = landscape ? base.height : base.width;
  const pageHeight = landscape ? base.width : base.height;

  const availW = pageWidth - 2 * m;
  const availH = pageHeight - 2 * m;
  const scale = Math.min(availW / img.width, availH / img.height);
  const width = img.width * scale;
  const height = img.height * scale;

  return {
    pageWidth,
    pageHeight,
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height,
  };
}

/** Reads the EXIF orientation of a JPEG (1 = normal). Phone photos often use 6 or 8. */
function jpegOrientation(buf: ArrayBuffer): number {
  const view = new DataView(buf);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return 1;
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset);
    if ((marker & 0xff00) !== 0xff00) return 1;
    if (marker === 0xffda) return 1; // image data starts, no EXIF found
    const size = view.getUint16(offset + 2);
    if (marker === 0xffe1) {
      const start = offset + 4;
      if (start + 14 > view.byteLength || view.getUint32(start) !== 0x45786966) return 1; // "Exif"
      const tiff = start + 6;
      const little = view.getUint16(tiff) === 0x4949;
      const ifd = tiff + view.getUint32(tiff + 4, little);
      if (ifd + 2 > view.byteLength) return 1;
      const count = view.getUint16(ifd, little);
      for (let i = 0; i < count; i++) {
        const entry = ifd + 2 + i * 12;
        if (entry + 12 > view.byteLength) return 1;
        if (view.getUint16(entry, little) === 0x0112) return view.getUint16(entry + 8, little);
      }
      return 1;
    }
    offset += 2 + size;
  }
  return 1;
}

type PreparedImage = { bytes: ArrayBuffer; format: "jpg" | "png"; size: Size };

/** Draw through a canvas: applies rotation, converts WebP, limits size for phones. */
async function reencode(file: File, format: "jpg" | "png"): Promise<PreparedImage> {
  const bmp = await createImageBitmap(file);
  try {
    let { width, height } = bmp;
    if (width * height > MAX_CANVAS_AREA) {
      const s = Math.sqrt(MAX_CANVAS_AREA / (width * height));
      width = Math.floor(width * s);
      height = Math.floor(height * s);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas is not available in this browser.");
    if (format === "jpg") {
      ctx.fillStyle = "#ffffff"; // JPG has no transparency
      ctx.fillRect(0, 0, width, height);
    }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("could not convert the image."))),
        format === "jpg" ? "image/jpeg" : "image/png",
        format === "jpg" ? 0.92 : undefined,
      ),
    );
    canvas.width = canvas.height = 0;
    return { bytes: await blob.arrayBuffer(), format, size: { width, height } };
  } finally {
    bmp.close();
  }
}

/**
 * Get bytes pdf-lib can embed. JPG and PNG are embedded as-is (no quality loss).
 * Rotated JPGs and WebP are converted first, because pdf-lib only reads JPG/PNG
 * and ignores EXIF rotation.
 */
async function prepareImage(file: File): Promise<PreparedImage> {
  const kind = await detectFileKind(file);
  if (kind === "jpeg") {
    const head = await file.slice(0, 131072).arrayBuffer();
    if (jpegOrientation(head) <= 1) {
      const bmp = await createImageBitmap(file);
      const size = { width: bmp.width, height: bmp.height };
      bmp.close();
      return { bytes: await file.arrayBuffer(), format: "jpg", size };
    }
    return reencode(file, "jpg");
  }
  if (kind === "png") {
    const bmp = await createImageBitmap(file);
    const size = { width: bmp.width, height: bmp.height };
    bmp.close();
    return { bytes: await file.arrayBuffer(), format: "png", size };
  }
  if (kind === "webp") return reencode(file, "jpg");
  throw new Error("unsupported image type.");
}

/** Build one PDF with one image per page. */
export async function buildPdfFromImages(
  files: File[],
  settings: LayoutSettings,
  title: string,
  onProgress: (done: number, total: number) => void,
  isCancelled: () => boolean,
): Promise<{ blob: Blob; pageCount: number; skipped: string[] } | null> {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  pdf.setCreator("PDFConvertly");
  pdf.setProducer("PDFConvertly (pdf-lib)");
  const skipped: string[] = [];

  for (let i = 0; i < files.length; i++) {
    if (isCancelled()) return null;
    onProgress(i, files.length);
    await new Promise((r) => setTimeout(r, 0)); // keep the page responsive

    const file = files[i];
    try {
      const prepared = await prepareImage(file);
      let image;
      try {
        image =
          prepared.format === "jpg" ? await pdf.embedJpg(prepared.bytes) : await pdf.embedPng(prepared.bytes);
      } catch {
        // Unusual PNG/JPG encodings: convert through canvas and try again
        const fallback = await reencode(file, prepared.format);
        image =
          fallback.format === "jpg" ? await pdf.embedJpg(fallback.bytes) : await pdf.embedPng(fallback.bytes);
      }

      const layout = computeLayout({ width: image.width, height: image.height }, settings);
      const page = pdf.addPage([layout.pageWidth, layout.pageHeight]);
      page.drawImage(image, { x: layout.x, y: layout.y, width: layout.width, height: layout.height });
    } catch {
      skipped.push(file.name); // one bad image should not stop the whole PDF
    }
  }

  onProgress(files.length, files.length);
  if (pdf.getPageCount() === 0) throw new Error("None of the images could be added to the PDF.");
  const bytes = await pdf.save();
  // Copy into a plain Uint8Array so TypeScript accepts it as a Blob part
  return { blob: new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), pageCount: pdf.getPageCount(), skipped };
}
