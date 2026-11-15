// Page-level PDF operations with pdf-lib: rotate pages and split/extract pages.
// Both are lossless: pages are copied as they are (text stays selectable).
import { describePdfError } from "@/lib/mergePdf";
import { SITE } from "@/lib/site";

async function loadPdf(file: File) {
  const { PDFDocument } = await import("pdf-lib");
  try {
    return await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
  } catch (e) {
    throw new Error(`This PDF ${describePdfError(e)}`);
  }
}

function toBlob(bytes: Uint8Array) {
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}

const norm = (deg: number) => (((Math.round(deg / 90) * 90) % 360) + 360) % 360;

/**
 * Rotate pages. `turns` maps page number (1-based) → extra degrees
 * (90, 180, 270). The rotation is added to whatever the page already had.
 */
export async function rotatePdf(file: File, turns: Record<number, number>): Promise<Blob> {
  const { degrees } = await import("pdf-lib");
  const doc = await loadPdf(file);
  doc.getPages().forEach((page, i) => {
    const extra = norm(turns[i + 1] ?? 0);
    if (extra) page.setRotation(degrees(norm(page.getRotation().angle + extra)));
  });
  doc.setProducer(`${SITE.name} (pdf-lib)`);
  return toBlob(await doc.save({ useObjectStreams: true }));
}

/**
 * "1-3, 5, 8-10" → [[1,2,3],[5],[8,9,10]] (each comma part stays a group,
 * in the order typed). Returns null if anything is invalid.
 */
export function parseRangeGroups(text: string, max: number): number[][] | null {
  const parts = text.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const groups: number[][] = [];
  for (const part of parts) {
    const m = part.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
    if (!m) return null;
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    if (a < 1 || b > max || a > b) return null;
    groups.push(Array.from({ length: b - a + 1 }, (_, i) => a + i));
  }
  return groups;
}

/** [1..total] cut into chunks of n pages. */
export function chunkPages(total: number, n: number): number[][] {
  const groups: number[][] = [];
  for (let start = 1; start <= total; start += n) {
    groups.push(Array.from({ length: Math.min(n, total - start + 1) }, (_, i) => start + i));
  }
  return groups;
}

/** "pages 1-3" / "page 5" / "pages 1, 4, 7" */
export function describeGroup(pages: number[]): string {
  if (pages.length === 1) return `page ${pages[0]}`;
  const consecutive = pages.every((p, i) => i === 0 || p === pages[i - 1] + 1);
  return consecutive ? `pages ${pages[0]}–${pages[pages.length - 1]}` : `pages ${pages.join(", ")}`;
}

export type SplitPart = { pages: number[]; blob: Blob };

/** Build one new PDF per group of pages. */
export async function splitPdf(
  file: File,
  groups: number[][],
  onProgress: (done: number, total: number) => void,
  isCancelled: () => boolean,
): Promise<SplitPart[] | null> {
  const { PDFDocument } = await import("pdf-lib");
  const src = await loadPdf(file);
  const parts: SplitPart[] = [];

  for (let i = 0; i < groups.length; i++) {
    if (isCancelled()) return null;
    onProgress(i, groups.length);
    await new Promise((r) => setTimeout(r, 0)); // keep the page responsive

    const out = await PDFDocument.create();
    out.setCreator(SITE.name);
    out.setProducer(`${SITE.name} (pdf-lib)`);
    const copied = await out.copyPages(src, groups[i].map((p) => p - 1));
    copied.forEach((p) => out.addPage(p));
    parts.push({ pages: groups[i], blob: toBlob(await out.save({ useObjectStreams: true })) });
  }
  onProgress(groups.length, groups.length);
  return parts;
}
