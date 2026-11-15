"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2, RotateCcw } from "lucide-react";
import Dropzone from "@/components/Dropzone";
import NextSteps from "@/components/NextSteps";
import { useHandoff } from "@/hooks/useHandoff";
import { blobToFile } from "@/lib/handoff";
import { STICKY_ACTIONS } from "@/lib/ui";
import { baseName, displayName, formatBytes, safeDownloadName } from "@/lib/files";
import { downloadBlob, downloadZip } from "@/lib/download";
import {
  describePdfjsError,
  firstPageSize,
  openPdf,
  parsePageRange,
  renderPage,
  renderThumbnail,
  type ImageFormat,
  type PdfDoc,
} from "@/lib/pdfRender";

const MAX_THUMBNAILS = 60; // more than this would be slow on phones
const MAX_EXPORT_PAGES = 100;
const DPI_OPTIONS = [
  { value: 72, label: "72 DPI", hint: "Screen" },
  { value: 150, label: "150 DPI", hint: "Standard" },
  { value: 300, label: "300 DPI", hint: "Print" },
];

type Result = { page: number; name: string; blob: Blob; url: string; width: number; height: number };

export default function PdfToImageTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [rangeText, setRangeText] = useState("");
  const [rangeError, setRangeError] = useState("");

  const [format, setFormat] = useState<ImageFormat>("image/jpeg");
  const [quality, setQuality] = useState(90);
  const [dpi, setDpi] = useState(150);

  const [results, setResults] = useState<Result[]>([]);
  const [opening, setOpening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const docRef = useRef<PdfDoc | null>(null);
  const closeRef = useRef<(() => Promise<void>) | null>(null); // frees the open PDF
  const thumbLoop = useRef<Promise<void> | null>(null); // the running thumbnail job
  const generation = useRef(0); // increases on every new file, stops old thumbnail loops
  const cancelRef = useRef(false);
  const urls = useRef<{ thumbs: Set<string>; results: Set<string> }>({ thumbs: new Set(), results: new Set() });

  // Clean up everything when leaving the page
  useEffect(() => {
    const u = urls.current;
    const closeHolder = closeRef;
    const loopHolder = thumbLoop;
    const gen = generation;
    return () => {
      gen.current++;
      u.thumbs.forEach((x) => URL.revokeObjectURL(x));
      u.results.forEach((x) => URL.revokeObjectURL(x));
      const close = closeHolder.current;
      const loop = loopHolder.current ?? Promise.resolve();
      if (close) void loop.catch(() => {}).then(close);
    };
  }, []);

  /**
   * Close the current PDF safely. If a thumbnail is still being drawn,
   * wait for it to finish first. Closing mid-draw causes
   * "Worker was destroyed" / "Transport destroyed" errors.
   */
  function disposeDoc() {
    const close = closeRef.current;
    const loop = thumbLoop.current ?? Promise.resolve();
    docRef.current = null;
    closeRef.current = null;
    thumbLoop.current = null;
    if (!close) return;
    void loop.catch(() => {}).then(close);
  }

  function clearResults() {
    urls.current.results.forEach((x) => URL.revokeObjectURL(x));
    urls.current.results.clear();
    setResults([]);
    setStatus("");
    setErrors([]);
  }

  function reset() {
    generation.current++;
    clearResults();
    urls.current.thumbs.forEach((x) => URL.revokeObjectURL(x));
    urls.current.thumbs.clear();
    disposeDoc();
    setFile(null);
    setPageCount(0);
    setPageSize(null);
    setThumbs({});
    setSelected(new Set());
    setRangeText("");
    setRangeError("");
  }

  async function handleFiles(files: File[]) {
    const f = files[0];
    if (!f) return;
    reset();
    const gen = generation.current;
    setOpening(true);
    try {
      const { doc, close } = await openPdf(f);
      if (gen !== generation.current) {
        void close();
        return;
      }
      docRef.current = doc;
      closeRef.current = close;
      setFile(f);
      setPageCount(doc.numPages);
      setSelected(new Set(Array.from({ length: doc.numPages }, (_, i) => i + 1)));
      setPageSize(await firstPageSize(doc));
      setOpening(false);

      // Render small previews one by one in the background
      const loop = (async () => {
        for (let p = 1; p <= Math.min(doc.numPages, MAX_THUMBNAILS); p++) {
          if (gen !== generation.current) return;
          try {
            const blob = await renderThumbnail(doc, p);
            if (gen !== generation.current) return;
            const url = URL.createObjectURL(blob);
            urls.current.thumbs.add(url);
            setThumbs((t) => ({ ...t, [p]: url }));
          } catch {
            // a page that can't be previewed is still listed by number
          }
        }
      })();
      thumbLoop.current = loop;
      await loop;
    } catch (e) {
      // Ignore errors from a PDF the user has already replaced
      if (gen === generation.current) setErrors([describePdfjsError(e)]);
    } finally {
      if (gen === generation.current) setOpening(false);
    }
  }

  // A PDF sent from the homepage or another tool
  useHandoff((files) => void handleFiles(files));

  function togglePage(p: number) {
    clearResults();
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  function selectAll(on: boolean) {
    clearResults();
    setSelected(on ? new Set(Array.from({ length: pageCount }, (_, i) => i + 1)) : new Set());
  }

  function applyRange() {
    const pages = parsePageRange(rangeText, pageCount);
    if (!pages) {
      setRangeError(`Enter pages like 1-3, 5 (between 1 and ${pageCount}).`);
      return;
    }
    clearResults();
    setRangeError("");
    setSelected(new Set(pages));
  }

  const selectedPages = [...selected].sort((a, b) => a - b);
  const tooMany = selectedPages.length > MAX_EXPORT_PAGES;
  const scale = dpi / 72;
  const estimate = pageSize
    ? `${Math.round(pageSize.width * scale)} × ${Math.round(pageSize.height * scale)} px`
    : null;

  async function convert() {
    const doc = docRef.current;
    if (!doc || !file) return;
    clearResults();
    cancelRef.current = false;
    setProcessing(true);

    const base = baseName(file.name);
    const ext = format === "image/jpeg" ? "jpg" : "png";
    const out: Result[] = [];
    const errs: string[] = [];
    let reducedAny = false;
    let cancelled = false;

    for (let i = 0; i < selectedPages.length; i++) {
      if (cancelRef.current) {
        cancelled = true;
        break;
      }
      const p = selectedPages[i];
      setStatus(`Converting page ${p} (${i + 1} of ${selectedPages.length})…`);
      await new Promise((r) => setTimeout(r, 0));
      try {
        const r = await renderPage(doc, p, scale, format, quality / 100);
        if (r.reduced) reducedAny = true;
        const url = URL.createObjectURL(r.blob);
        urls.current.results.add(url);
        out.push({
          page: p,
          name: safeDownloadName(`${base}-page-${p}`, ext),
          blob: r.blob,
          url,
          width: r.width,
          height: r.height,
        });
      } catch {
        errs.push(`Page ${p} could not be converted.`);
      }
    }

    if (reducedAny) errs.push("Some pages were very large and were saved at a lower resolution so they work on all devices.");
    setResults(out);
    setErrors(errs);
    setStatus(
      cancelled
        ? `Cancelled. ${out.length} page(s) were converted before stopping.`
        : `Done: ${out.length} image${out.length === 1 ? "" : "s"} ready.`,
    );
    setProcessing(false);
  }

  async function downloadAll() {
    if (!file) return;
    setZipping(true);
    try {
      await downloadZip(
        results.map((r) => ({ name: r.name, blob: r.blob })),
        safeDownloadName(`${baseName(file.name)}-images`, "zip"),
      );
    } catch {
      setErrors(["Could not create the ZIP file. Try downloading images one by one."]);
    } finally {
      setZipping(false);
    }
  }

  const chip =
    "rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:border-blue-400 hover:bg-blue-50";

  return (
    <div className="space-y-6">
      {!file && (
        <Dropzone accept={["pdf"]} multiple={false} maxSizeMB={100} onFiles={handleFiles} title="Drop a PDF here" />
      )}

      {opening && (
        <p className="flex items-center gap-2 text-sm text-slate-700" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Opening PDF…
        </p>
      )}

      {file && (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-100">
              <FileText className="h-6 w-6 text-slate-500" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-900">{displayName(file.name)}</p>
              <p className="text-sm text-slate-500">
                {pageCount} page{pageCount === 1 ? "" : "s"} · {formatBytes(file.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              disabled={processing}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Choose another PDF
            </button>
          </div>

          <section aria-labelledby="pages-heading" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="pages-heading" className="text-lg font-semibold text-slate-900">
                Pages <span className="text-sm font-normal text-slate-500">({selectedPages.length} selected)</span>
              </h2>
              <div className="flex gap-2">
                <button type="button" className={chip} onClick={() => selectAll(true)}>
                  Select all
                </button>
                <button type="button" className={chip} onClick={() => selectAll(false)}>
                  Select none
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1">
                <label htmlFor="range" className="block text-sm font-medium text-slate-700">
                  Page range
                </label>
                <input
                  id="range"
                  type="text"
                  value={rangeText}
                  onChange={(e) => setRangeText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyRange();
                  }}
                  placeholder="e.g. 1-3, 5"
                  aria-invalid={rangeError ? true : undefined}
                  aria-describedby={rangeError ? "range-error" : undefined}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <button
                type="button"
                onClick={applyRange}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Apply
              </button>
            </div>
            {rangeError && (
              <p id="range-error" className="text-sm text-red-600">
                {rangeError}
              </p>
            )}

            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-6">
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => {
                const on = selected.has(p);
                return (
                  <li key={p}>
                    <button
                      type="button"
                      onClick={() => togglePage(p)}
                      aria-pressed={on}
                      aria-label={`Page ${p}${on ? ", selected" : ""}`}
                      className={`block w-full rounded-lg border-2 p-1 text-center transition focus-visible:outline-2 focus-visible:outline-blue-600 ${
                        on ? "border-blue-600 bg-blue-50" : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <span className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded bg-slate-100">
                        {thumbs[p] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumbs[p]} alt="" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <span className="text-xs text-slate-400">{p <= MAX_THUMBNAILS ? "…" : `Page ${p}`}</span>
                        )}
                      </span>
                      <span className="mt-1 block text-xs text-slate-600">{p}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="img-settings" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 id="img-settings" className="text-lg font-semibold text-slate-900">
              Image settings
            </h2>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="img-format" className="block text-sm font-medium text-slate-700">
                  Format
                </label>
                <select
                  id="img-format"
                  value={format}
                  onChange={(e) => {
                    clearResults();
                    setFormat(e.target.value as ImageFormat);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="image/jpeg">JPG (smaller files)</option>
                  <option value="image/png">PNG (sharpest text)</option>
                </select>
              </div>
              {format === "image/jpeg" && (
                <div>
                  <label htmlFor="img-quality" className="block text-sm font-medium text-slate-700">
                    Quality: <span className="font-semibold">{quality}</span>
                  </label>
                  <input
                    id="img-quality"
                    type="range"
                    min={30}
                    max={100}
                    value={quality}
                    onChange={(e) => {
                      clearResults();
                      setQuality(Number(e.target.value));
                    }}
                    className="mt-3 w-full accent-blue-600"
                  />
                </div>
              )}
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-slate-700">Resolution</legend>
              <div className="mt-2 inline-flex flex-wrap rounded-lg border border-slate-300 p-1">
                {DPI_OPTIONS.map((o) => (
                  <label
                    key={o.value}
                    className={`cursor-pointer rounded-md px-3 py-2 text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue-600 ${
                      dpi === o.value ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="dpi"
                      value={o.value}
                      checked={dpi === o.value}
                      onChange={() => {
                        clearResults();
                        setDpi(o.value);
                      }}
                      className="sr-only"
                    />
                    {o.label} <span className="opacity-75">· {o.hint}</span>
                  </label>
                ))}
              </div>
              {estimate && <p className="mt-2 text-sm text-slate-600">Page 1 will be about {estimate}.</p>}
            </fieldset>

            {tooMany && (
              <p className="text-sm text-amber-700">
                Please select {MAX_EXPORT_PAGES} pages or fewer at a time ({selectedPages.length} selected).
              </p>
            )}

            <div className={STICKY_ACTIONS}>
            {processing ? (
              <button
                type="button"
                onClick={() => {
                  cancelRef.current = true;
                }}
                className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={convert}
                disabled={selectedPages.length === 0 || tooMany}
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Convert {selectedPages.length} page{selectedPages.length === 1 ? "" : "s"}
              </button>
            )}
            </div>
          </section>
        </>
      )}

      <div role="status" aria-live="polite" className="text-sm text-slate-700">
        {status && (
          <p className="flex items-center gap-2">
            {processing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {status}
          </p>
        )}
      </div>

      {errors.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      {results.length > 0 && (
        <section aria-labelledby="results-heading" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="results-heading" className="text-lg font-semibold text-slate-900">
              Your images
            </h2>
            {results.length > 1 && (
              <button
                type="button"
                onClick={downloadAll}
                disabled={zipping}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {zipping ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Download className="h-4 w-4" aria-hidden="true" />
                )}
                Download all (ZIP)
              </button>
            )}
          </div>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {results.map((r) => (
              <li key={r.page} className="rounded-xl border border-slate-200 p-2">
                <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.url} alt={`Page ${r.page}`} className="max-h-full max-w-full object-contain" loading="lazy" />
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  Page {r.page} · {r.width}×{r.height} · {formatBytes(r.blob.size)}
                </p>
                <button
                  type="button"
                  onClick={() => downloadBlob(r.blob, r.name)}
                  className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download
                </button>
              </li>
            ))}
          </ul>

          <NextSteps files={results.map((r) => blobToFile(r.blob, r.name))} kind="image" current="/pdf-to-image" />
        </section>
      )}
    </div>
  );
}
