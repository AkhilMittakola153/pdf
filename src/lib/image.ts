// Image helpers built on the browser Canvas API. Nothing is uploaded.

export type OutputMime = "image/jpeg" | "image/png" | "image/webp";
export type Size = { width: number; height: number };

// iOS Safari refuses canvases larger than ~16.7 megapixels (4096 × 4096).
export const MAX_CANVAS_AREA = 16_777_216;

export function mimeToExt(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "png";
}

export function originalMime(file: File): OutputMime {
  const allowed: OutputMime[] = ["image/jpeg", "image/png", "image/webp"];
  return allowed.includes(file.type as OutputMime) ? (file.type as OutputMime) : "image/png";
}

/** Reads pixel dimensions (respects photo rotation from EXIF). */
export async function getImageSize(file: File): Promise<Size> {
  const bmp = await createImageBitmap(file);
  const size = { width: bmp.width, height: bmp.height };
  bmp.close();
  return size;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("the browser could not encode the image."))),
      type,
      quality,
    );
  });
}

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas is not available in this browser.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return { canvas, ctx };
}

/**
 * Resize one image file to an exact pixel size.
 * Large reductions are done in halves first, which gives sharper results
 * than a single big jump.
 */
export async function resizeImageFile(
  file: File,
  target: Size,
  type: OutputMime,
  quality: number, // 1–100, ignored for PNG
): Promise<Blob> {
  if (target.width * target.height > MAX_CANVAS_AREA) {
    throw new Error(
      `${target.width} × ${target.height} px is too large for the browser (limit is about 16 megapixels).`,
    );
  }

  const bmp = await createImageBitmap(file);
  try {
    let source: CanvasImageSource = bmp;
    let sw = bmp.width;
    let sh = bmp.height;
    let previous: HTMLCanvasElement | null = null;

    while (sw / 2 >= target.width && sh / 2 >= target.height) {
      const { canvas, ctx } = makeCanvas(Math.round(sw / 2), Math.round(sh / 2));
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      if (previous) previous.width = previous.height = 0; // free memory
      previous = canvas;
      source = canvas;
      sw = canvas.width;
      sh = canvas.height;
    }

    const { canvas, ctx } = makeCanvas(target.width, target.height);
    if (type === "image/jpeg") {
      // JPG has no transparency: paint white so transparent areas don't turn black
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

    const blob = await canvasToBlob(canvas, type, type === "image/png" ? undefined : quality / 100);
    canvas.width = canvas.height = 0;
    if (previous) previous.width = previous.height = 0;
    return blob;
  } finally {
    bmp.close();
  }
}

/** A crop box in pixels of the source image (used by the ImageCropper component). */
export type CropRect = { x: number; y: number; w: number; h: number };
