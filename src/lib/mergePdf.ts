// Merge PDF helpers using pdf-lib (loaded only when needed).

/** Turn pdf-lib errors into a short message a visitor understands. */
export function describePdfError(e: unknown): string {
  const msg = e instanceof Error ? e.message.toLowerCase() : "";
  if (msg.includes("encrypt")) return "is password-protected. Remove the password first, then try again.";
  return "is damaged or not a valid PDF.";
}

/** Count pages. Throws if the PDF is encrypted or broken. */
export async function readPdfPageCount(file: File): Promise<number> {
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
  return doc.getPageCount();
}

/** Copy every page of every file, in order, into one new PDF. */
export async function mergePdfs(
  files: File[],
  title: string,
  onProgress: (done: number, total: number) => void,
  isCancelled: () => boolean,
): Promise<{ blob: Blob; pageCount: number } | null> {
  const { PDFDocument } = await import("pdf-lib");
  const merged = await PDFDocument.create();
  merged.setTitle(title);
  merged.setCreator("PDFConvertly");
  merged.setProducer("PDFConvertly (pdf-lib)");

  for (let i = 0; i < files.length; i++) {
    if (isCancelled()) return null;
    onProgress(i, files.length);
    await new Promise((r) => setTimeout(r, 0)); // keep the page responsive

    const file = files[i];
    let src;
    try {
      src = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
    } catch (e) {
      throw new Error(`"${file.name}" ${describePdfError(e)}`);
    }
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }

  onProgress(files.length, files.length);
  const bytes = await merged.save({ useObjectStreams: true }); // smaller file
  return {
    blob: new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
    pageCount: merged.getPageCount(),
  };
}
