"use client";

// Opens a PDF for the editor: renders each page as a large image to draw on,
// and records each page's size and coordinate converter (for saving edits).
import { useEffect, useRef, useState } from "react";
import type { PageInfo } from "@/lib/pdfEdit";
import { describePdfjsError, openPdf, renderPage } from "@/lib/pdfRender";

export const MAX_EDIT_PAGES = 100;
const SCALE = 1.6; // render resolution: 1.6 px per point ≈ 115 DPI, sharp enough on most screens

export function usePdfEditorPages() {
  const [file, setFile] = useState<File | null>(null);
  const [infos, setInfos] = useState<PageInfo[]>([]);
  const [images, setImages] = useState<Record<number, string>>({});
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");

  const generation = useRef(0);
  const closeRef = useRef<(() => Promise<void>) | null>(null);
  const loopRef = useRef<Promise<void> | null>(null);
  const urls = useRef<Set<string>>(new Set());

  function dispose() {
    const close = closeRef.current;
    const loop = loopRef.current ?? Promise.resolve();
    closeRef.current = null;
    loopRef.current = null;
    if (close) void loop.catch(() => {}).then(close);
  }

  useEffect(() => {
    const set = urls.current;
    const gen = generation;
    const closeHolder = closeRef;
    const loopHolder = loopRef;
    return () => {
      gen.current++;
      set.forEach((u) => URL.revokeObjectURL(u));
      const close = closeHolder.current;
      const loop = loopHolder.current ?? Promise.resolve();
      if (close) void loop.catch(() => {}).then(close);
    };
  }, []);

  function reset() {
    generation.current++;
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current.clear();
    dispose();
    setFile(null);
    setInfos([]);
    setImages({});
    setError("");
  }

  async function open(f: File) {
    reset();
    const gen = generation.current;
    setOpening(true);
    try {
      const { doc, close } = await openPdf(f);
      if (gen !== generation.current) {
        void close();
        return;
      }
      closeRef.current = close;
      if (doc.numPages > MAX_EDIT_PAGES) {
        throw Object.assign(new Error(`This PDF has ${doc.numPages} pages. Please split it into parts of ${MAX_EDIT_PAGES} pages or fewer first.`), {
          name: "TooLong",
        });
      }

      // Page sizes and coordinate converters (fast, no drawing)
      const list: PageInfo[] = [];
      for (let p = 1; p <= doc.numPages; p++) {
        const vp = (await doc.getPage(p)).getViewport({ scale: 1 });
        list.push({
          width: vp.width,
          height: vp.height,
          rotation: vp.rotation,
          toPdf: (x, y) => vp.convertToPdfPoint(x, y),
        });
      }
      if (gen !== generation.current) return;
      setInfos(list);
      setFile(f);
      setOpening(false);

      // Draw the pages one by one in the background
      const loop = (async () => {
        for (let p = 1; p <= doc.numPages; p++) {
          if (gen !== generation.current) return;
          try {
            const { blob } = await renderPage(doc, p, SCALE, "image/jpeg", 0.88);
            if (gen !== generation.current) return;
            const url = URL.createObjectURL(blob);
            urls.current.add(url);
            setImages((m) => ({ ...m, [p]: url }));
          } catch {
            // page stays as a blank sheet; edits can still be placed
          }
        }
      })();
      loopRef.current = loop;
      await loop;
    } catch (e) {
      if (gen === generation.current) {
        setError(e instanceof Error && e.name === "TooLong" ? e.message : describePdfjsError(e));
        dispose();
      }
    } finally {
      if (gen === generation.current) setOpening(false);
    }
  }

  return { file, infos, images, opening, error, open, reset };
}
