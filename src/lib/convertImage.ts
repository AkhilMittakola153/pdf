// Convert images between JPG, PNG and WebP with the Canvas API.
import { MAX_CANVAS_AREA } from "@/lib/image";

export type TargetFormat = "image/jpeg" | "image/png" | "image/webp";

export type Converted = { blob: Blob; width: number; height: number; reduced: boolean; fallback: boolean };

export async function convertImage(
  file: File,
  type: TargetFormat,
  quality: number, // 1–100, used for JPG and WebP
  background: string, // fills transparent areas when saving as JPG, e.g. "#ffffff"
): Promise<Converted> {
  const bmp = await createImageBitmap(file); // also applies phone rotation
  try {
    let w = bmp.width;
    let h = bmp.height;
    let reduced = false;
    if (w * h > MAX_CANVAS_AREA) {
      const s = Math.sqrt(MAX_CANVAS_AREA / (w * h));
      w = Math.floor(w * s);
      h = Math.floor(h * s);
      reduced = true;
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas is not available in this browser.");
    if (type === "image/jpeg") {
      ctx.fillStyle = background; // JPG cannot be transparent
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("could not save the image."))),
        type,
        type === "image/png" ? undefined : quality / 100,
      ),
    );
    canvas.width = canvas.height = 0;
    // Older Safari can't save WebP and silently returns PNG
    return { blob, width: w, height: h, reduced, fallback: blob.type !== type };
  } finally {
    bmp.close();
  }
}
