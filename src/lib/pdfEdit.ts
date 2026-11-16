// Edit / Sign PDF: the list of things a user adds to pages, and how they are
// written into the PDF with pdf-lib.
//
// Positions are stored in PDF points (72 pt = 1 inch), measured from the
// TOP-LEFT of the page as the user sees it. When saving, each point is
// converted to the PDF's own coordinates with PDF.js (`toPdf`), which also
// handles rotated pages and cropped pages correctly.
import type { PDFImage } from "pdf-lib";
import { describePdfError } from "@/lib/mergePdf";
import { SITE } from "@/lib/site";

export type TextAnnot = { id: string; page: number; kind: "text"; x: number; y: number; text: string; size: number; color: string };
export type RectAnnot = { id: string; page: number; kind: "rect"; x: number; y: number; w: number; h: number; style: "whiteout" | "highlight" };
export type InkAnnot = {
  id: string;
  page: number;
  kind: "ink";
  x: number;
  y: number;
  w: number;
  h: number;
  points: [number, number][]; // relative to x, y
  color: string;
  width: number;
};
export type ImageAnnot = {
  id: string;
  page: number;
  kind: "image";
  x: number;
  y: number;
  w: number;
  h: number;
  src: string; // data: URL
  mime: "image/png" | "image/jpeg";
};
export type Annot = TextAnnot | RectAnnot | InkAnnot | ImageAnnot;

export type PageInfo = {
  width: number; // as displayed, in points
  height: number;
  rotation: number; // 0, 90, 180 or 270 (the page's own rotation setting)
  toPdf: (x: number, y: number) => number[]; // displayed point → PDF coordinates
};

/** Text baseline sits this far below the top of the text box (× font size). Matches the on-screen look. */
export const BASELINE = 0.93;
export const LINE_HEIGHT = 1.2;

export const HIGHLIGHT = { r: 1, g: 0.9, b: 0.2, opacity: 0.4 };

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

export async function savePdfWithEdits(file: File, annots: Annot[], pages: PageInfo[]): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb, degrees, LineCapStyle } = await import("pdf-lib");

  let doc;
  try {
    doc = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
  } catch (e) {
    throw new Error(`This PDF ${describePdfError(e)}`);
  }

  const font = await doc.embedFont(StandardFonts.Helvetica);

  // The built-in PDF font only has Western letters. Check before drawing.
  const supported = new Set(font.getCharacterSet());
  const bad = new Set<string>();
  for (const a of annots) {
    if (a.kind !== "text") continue;
    for (const ch of a.text.replace(/\n/g, "")) {
      const cp = ch.codePointAt(0)!;
      if (!supported.has(cp)) bad.add(ch);
    }
  }
  if (bad.size > 0) {
    throw new Error(
      `These characters can't be added yet: ${[...bad].join(" ")}. For now, text supports English letters, numbers and common symbols.`,
    );
  }

  const images = new Map<string, PDFImage>();
  const getImage = async (a: ImageAnnot) => {
    let img = images.get(a.src);
    if (!img) {
      const bytes = await (await fetch(a.src)).arrayBuffer();
      img = a.mime === "image/png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
      images.set(a.src, img);
    }
    return img;
  };

  for (const a of annots) {
    const info = pages[a.page - 1];
    if (!info) continue;
    const page = doc.getPage(a.page - 1);
    const rotate = degrees(info.rotation);

    if (a.kind === "rect") {
      const [x1, y1] = info.toPdf(a.x, a.y);
      const [x2, y2] = info.toPdf(a.x + a.w, a.y + a.h);
      const white = a.style === "whiteout";
      page.drawRectangle({
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
        color: white ? rgb(1, 1, 1) : rgb(HIGHLIGHT.r, HIGHLIGHT.g, HIGHLIGHT.b),
        opacity: white ? 1 : HIGHLIGHT.opacity,
      });
    } else if (a.kind === "text") {
      if (!a.text.trim()) continue;
      const c = hexToRgb(a.color);
      const [bx, by] = info.toPdf(a.x, a.y + a.size * BASELINE);
      page.drawText(a.text, {
        x: bx,
        y: by,
        size: a.size,
        font,
        color: rgb(c.r, c.g, c.b),
        lineHeight: a.size * LINE_HEIGHT,
        rotate, // keeps text upright on rotated pages
      });
    } else if (a.kind === "image") {
      const img = await getImage(a);
      const [bx, by] = info.toPdf(a.x, a.y + a.h); // bottom-left corner as seen on screen
      page.drawImage(img, { x: bx, y: by, width: a.w, height: a.h, rotate });
    } else if (a.kind === "ink") {
      const c = hexToRgb(a.color);
      const color = rgb(c.r, c.g, c.b);
      const pts = a.points.map(([px, py]) => info.toPdf(a.x + px, a.y + py));
      if (pts.length === 1) {
        page.drawCircle({ x: pts[0][0], y: pts[0][1], size: a.width / 2, color });
      }
      for (let i = 1; i < pts.length; i++) {
        page.drawLine({
          start: { x: pts[i - 1][0], y: pts[i - 1][1] },
          end: { x: pts[i][0], y: pts[i][1] },
          thickness: a.width,
          color,
          lineCap: LineCapStyle.Round,
        });
      }
    }
  }

  doc.setProducer(`${SITE.name} (pdf-lib)`);
  const bytes = await doc.save({ useObjectStreams: true });
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}
