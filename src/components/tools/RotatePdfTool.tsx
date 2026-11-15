"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, Loader2, RotateCcw, RotateCw } from "lucide-react";
import Dropzone from "@/components/Dropzone";
import NextSteps from "@/components/NextSteps";
import PdfFileCard from "@/components/PdfFileCard";
import { useHandoff } from "@/hooks/useHandoff";
import { usePdfPages } from "@/hooks/usePdfPages";
import { downloadBlob } from "@/lib/download";
import { baseName, formatBytes, safeDownloadName } from "@/lib/files";
import { blobToFile } from "@/lib/handoff";
import { rotatePdf } from "@/lib/pdfPages";
import { STICKY_ACTIONS } from "@/lib/ui";

type Result = { blob: Blob; url: string; name: string };

const smallBtn =
  "rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600";
const toolbarBtn =
  "inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50";

export default function RotatePdfTool() {
  const pdf = usePdfPages();
  const [turns, setTurns] = useState<Record<number, number>>({}); // page → extra degrees
  const [result, setResult] = useState<Result | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const resultUrl = useRef<string | null>(null);

  useEffect(() => {
    const ref = resultUrl;
    return () => {
      if (ref.current) URL.revokeObjectURL(ref.current);
    };
  }, []);

  function clearResult() {
    if (resultUrl.current) URL.revokeObjectURL(resultUrl.current);
    resultUrl.current = null;
    setResult(null);
    setError("");
  }

  function handleFiles(files: File[]) {
    if (!files[0]) return;
    clearResult();
    setTurns({});
    void pdf.open(files[0]);
  }

  // A PDF sent from the homepage or another tool
  useHandoff(handleFiles);

  function reset() {
    clearResult();
    setTurns({});
    pdf.reset();
  }

  function rotate(page: number, by: number) {
    clearResult();
    setTurns((t) => ({ ...t, [page]: ((((t[page] ?? 0) + by) % 360) + 360) % 360 }));
  }

  function rotateAll(by: number) {
    clearResult();
    setTurns((t) => {
      const next: Record<number, number> = {};
      for (let p = 1; p <= pdf.pageCount; p++) next[p] = ((((t[p] ?? 0) + by) % 360) + 360) % 360;
      return next;
    });
  }

  const changed = Object.values(turns).filter((d) => Number(d) % 360 !== 0).length;

  async function save() {
    if (!pdf.file) return;
    clearResult();
    setProcessing(true);
    try {
      const blob = await rotatePdf(pdf.file, turns);
      const name = safeDownloadName(`${baseName(pdf.file.name)}-rotated`, "pdf");
      const url = URL.createObjectURL(blob);
      resultUrl.current = url;
      setResult({ blob, url, name });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong while rotating.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      {!pdf.file && !pdf.opening && (
        <Dropzone accept={["pdf"]} multiple={false} maxSizeMB={100} onFiles={handleFiles} title="Drop a PDF here" />
      )}

      {pdf.opening && (
        <p className="flex items-center gap-2 text-sm text-slate-700" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Opening PDF…
        </p>
      )}

      {(pdf.error || error) && (
        <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {pdf.error || error}
        </p>
      )}

      {pdf.file && (
        <>
          <PdfFileCard file={pdf.file} pageCount={pdf.pageCount} onReset={reset} disabled={processing} />

          <section aria-labelledby="rotate-heading" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="rotate-heading" className="text-lg font-semibold text-slate-900">
                Rotate pages
              </h2>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={toolbarBtn} onClick={() => rotateAll(-90)}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> All left
                </button>
                <button type="button" className={toolbarBtn} onClick={() => rotateAll(90)}>
                  <RotateCw className="h-4 w-4" aria-hidden="true" /> All right
                </button>
                <button
                  type="button"
                  className={toolbarBtn}
                  onClick={() => {
                    clearResult();
                    setTurns({});
                  }}
                  disabled={changed === 0}
                >
                  Reset
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-500">Tap a page to turn it right, or use the arrows under it.</p>

            <ul className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: pdf.pageCount }, (_, i) => i + 1).map((p) => {
                const deg = turns[p] ?? 0;
                return (
                  <li key={p} className="text-center">
                    <button
                      type="button"
                      onClick={() => rotate(p, 90)}
                      aria-label={`Page ${p}, rotated ${deg} degrees. Rotate right`}
                      className={`flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border-2 bg-slate-50 p-2 focus-visible:outline-2 focus-visible:outline-blue-600 ${
                        deg ? "border-blue-500" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {pdf.thumbs[p] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={pdf.thumbs[p]}
                          alt=""
                          className="max-h-full max-w-full object-contain shadow-sm transition-transform duration-200"
                          style={{ transform: `rotate(${deg}deg)` }}
                        />
                      ) : (
                        <span
                          className="flex h-3/4 w-1/2 items-center justify-center rounded bg-white text-xs text-slate-500 shadow-sm transition-transform duration-200"
                          style={{ transform: `rotate(${deg}deg)` }}
                        >
                          {p}
                        </span>
                      )}
                    </button>
                    <div className="mt-1 flex items-center justify-center gap-1">
                      <button type="button" className={smallBtn} onClick={() => rotate(p, -90)} aria-label={`Rotate page ${p} left`}>
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <span className="w-8 text-xs text-slate-600">{p}</span>
                      <button type="button" className={smallBtn} onClick={() => rotate(p, 90)} aria-label={`Rotate page ${p} right`}>
                        <RotateCw className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className={STICKY_ACTIONS}>
              <button
                type="button"
                onClick={save}
                disabled={changed === 0 || processing}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {changed === 0 ? "Rotate a page first" : `Save PDF (${changed} page${changed === 1 ? "" : "s"} rotated)`}
              </button>
            </div>
          </section>
        </>
      )}

      {result && (
        <section
          aria-label="Your rotated PDF"
          className="flex flex-wrap items-center gap-4 rounded-2xl border border-green-200 bg-green-50 p-5"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900">{result.name}</p>
            <p className="text-sm text-slate-600">
              {pdf.pageCount} pages · {formatBytes(result.blob.size)}
            </p>
          </div>
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Open
          </a>
          <button
            type="button"
            onClick={() => downloadBlob(result.blob, result.name)}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 font-semibold text-white hover:bg-green-700"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download PDF
          </button>
          <div className="w-full">
            <NextSteps files={[blobToFile(result.blob, result.name)]} kind="pdf" current="/rotate-pdf" />
          </div>
        </section>
      )}
    </div>
  );
}
