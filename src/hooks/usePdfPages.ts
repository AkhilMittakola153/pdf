"use client";

// Opens one PDF with PDF.js and renders small page previews in the background.
// Shared by Rotate PDF and Split PDF. Cleans up safely when the file changes.
import { useEffect, useRef, useState } from "react";
import { describePdfjsError, openPdf, renderThumbnail } from "@/lib/pdfRender";

export function usePdfPages(maxThumbnails = 60) {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");

  const generation = useRef(0); // stops old preview loops when a new file is opened
  const closeRef = useRef<(() => Promise<void>) | null>(null);
  const loopRef = useRef<Promise<void> | null>(null);
  const urls = useRef<Set<string>>(new Set());

  function dispose() {
    const close = closeRef.current;
    const loop = loopRef.current ?? Promise.resolve();
    closeRef.current = null;
    loopRef.current = null;
    // Wait for a preview that is still drawing, then close the PDF
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
    setPageCount(0);
    setThumbs({});
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
      setFile(f);
      setPageCount(doc.numPages);
      setOpening(false);

      const loop = (async () => {
        for (let p = 1; p <= Math.min(doc.numPages, maxThumbnails); p++) {
          if (gen !== generation.current) return;
          try {
            const blob = await renderThumbnail(doc, p);
            if (gen !== generation.current) return;
            const url = URL.createObjectURL(blob);
            urls.current.add(url);
            setThumbs((t) => ({ ...t, [p]: url }));
          } catch {
            // the page is still listed by number
          }
        }
      })();
      loopRef.current = loop;
      await loop;
    } catch (e) {
      if (gen === generation.current) setError(describePdfjsError(e));
    } finally {
      if (gen === generation.current) setOpening(false);
    }
  }

  return { file, pageCount, thumbs, opening, error, open, reset, maxThumbnails };
}
