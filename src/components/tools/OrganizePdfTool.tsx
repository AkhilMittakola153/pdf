"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  RotateCw,
  Trash2,
  Undo2,
} from "lucide-react";
import Dropzone from "@/components/Dropzone";
import NextSteps from "@/components/NextSteps";
import PdfFileCard from "@/components/PdfFileCard";
import { useHandoff } from "@/hooks/useHandoff";
import { usePdfPages } from "@/hooks/usePdfPages";
import { downloadBlob } from "@/lib/download";
import { baseName, formatBytes, safeDownloadName } from "@/lib/files";
import { blobToFile } from "@/lib/handoff";
import { organizePdf } from "@/lib/pdfPages";
import { STICKY_ACTIONS } from "@/lib/ui";

type Tile = { page: number; rotate: number; removed: boolean }; // page = original page number
type Result = { blob: Blob; url: string; name: string; pages: number };

const iconBtn =
  "rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-30";
const toolbarBtn =
  "inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50";

const freshTiles = (n: number): Tile[] => Array.from({ length: n }, (_, i) => ({ page: i + 1, rotate: 0, removed: false }));

export default function OrganizePdfTool() {
  const pdf = usePdfPages();
  // null = untouched, i.e. original order (derived from the page count)
  const [edited, setEdited] = useState<Tile[] | null>(null);
  const tiles = edited ?? freshTiles(pdf.pageCount);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
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
    setEdited(null);
    void pdf.open(files[0]);
  }

  // A PDF sent from the homepage or another tool
  useHandoff(handleFiles);

  function reset() {
    clearResult();
    setEdited(null);
    pdf.reset();
  }

  function edit(fn: (t: Tile[]) => Tile[]) {
    clearResult();
    setEdited((prev) => fn(prev ?? freshTiles(pdf.pageCount)));
  }

  const moveTile = (from: number, to: number) =>
    edit((t) => {
      if (to < 0 || to >= t.length || from === to) return t;
      const copy = [...t];
      const [m] = copy.splice(from, 1);
      copy.splice(to, 0, m);
      return copy;
    });

  const kept = tiles.filter((t) => !t.removed);
  const changed = tiles.some((t, i) => t.page !== i + 1 || t.rotate % 360 !== 0 || t.removed);

  async function save() {
    if (!pdf.file || kept.length === 0) return;
    clearResult();
    setProcessing(true);
    try {
      const blob = await organizePdf(
        pdf.file,
        kept.map((t) => ({ page: t.page, rotate: t.rotate })),
      );
      const url = URL.createObjectURL(blob);
      resultUrl.current = url;
      setResult({ blob, url, name: safeDownloadName(`${baseName(pdf.file.name)}-organized`, "pdf"), pages: kept.length });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong while saving.");
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

          <section aria-labelledby="org-heading" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="org-heading" className="text-lg font-semibold text-slate-900">
                Pages <span className="text-sm font-normal text-slate-500">({kept.length} of {tiles.length} kept)</span>
              </h2>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={toolbarBtn} onClick={() => edit((t) => [...t].reverse())}>
                  <ArrowDownUp className="h-4 w-4" aria-hidden="true" /> Reverse
                </button>
                <button type="button" className={toolbarBtn} onClick={() => {
                    clearResult();
                    setEdited(null);
                  }} disabled={!changed}>
                  <Undo2 className="h-4 w-4" aria-hidden="true" /> Reset
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-500">
              Drag pages to reorder them (or use the arrows), and use the buttons to rotate or remove a page.
            </p>

            <ol className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
              {tiles.map((t, i) => (
                <li
                  key={t.page}
                  draggable
                  onDragStart={(e) => {
                    setDragIndex(i);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", String(t.page));
                  }}
                  onDragOver={(e) => {
                    if (dragIndex === null) return;
                    e.preventDefault();
                    if (overIndex !== i) setOverIndex(i);
                  }}
                  onDrop={(e) => {
                    if (dragIndex === null) return;
                    e.preventDefault();
                    moveTile(dragIndex, i);
                    setDragIndex(null);
                    setOverIndex(null);
                  }}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setOverIndex(null);
                  }}
                  className={`cursor-grab rounded-xl border-2 p-2 text-center transition active:cursor-grabbing ${
                    overIndex === i && dragIndex !== i ? "border-blue-500 bg-blue-50" : "border-slate-200"
                  } ${dragIndex === i ? "opacity-40" : ""}`}
                >
                  <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-slate-50 p-2">
                    {pdf.thumbs[t.page] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pdf.thumbs[t.page]}
                        alt=""
                        draggable={false}
                        className={`max-h-full max-w-full object-contain shadow-sm transition-transform duration-200 ${t.removed ? "opacity-25" : ""}`}
                        style={{ transform: `rotate(${t.rotate}deg)` }}
                      />
                    ) : (
                      <span
                        className={`flex h-3/4 w-1/2 items-center justify-center rounded bg-white text-xs text-slate-500 shadow-sm ${t.removed ? "opacity-25" : ""}`}
                        style={{ transform: `rotate(${t.rotate}deg)` }}
                      >
                        {t.page}
                      </span>
                    )}
                    {t.removed && (
                      <span className="absolute rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">Removed</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {t.removed ? "—" : `Page ${kept.indexOf(t) + 1}`}
                    {t.page !== i + 1 && !t.removed && <span className="text-slate-400"> (was {t.page})</span>}
                  </p>
                  <div className="mt-1 flex items-center justify-center gap-0.5">
                    <button type="button" className={iconBtn} onClick={() => moveTile(i, i - 1)} disabled={i === 0} aria-label={`Move page ${t.page} earlier`}>
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={iconBtn}
                      onClick={() => edit((all) => all.map((x) => (x.page === t.page ? { ...x, rotate: (x.rotate + 90) % 360 } : x)))}
                      disabled={t.removed}
                      aria-label={`Rotate page ${t.page}`}
                    >
                      <RotateCw className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`${iconBtn} ${t.removed ? "text-blue-700" : "hover:text-red-600"}`}
                      onClick={() => edit((all) => all.map((x) => (x.page === t.page ? { ...x, removed: !x.removed } : x)))}
                      aria-label={t.removed ? `Restore page ${t.page}` : `Remove page ${t.page}`}
                    >
                      {t.removed ? <Undo2 className="h-4 w-4" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
                    </button>
                    <button
                      type="button"
                      className={iconBtn}
                      onClick={() => moveTile(i, i + 1)}
                      disabled={i === tiles.length - 1}
                      aria-label={`Move page ${t.page} later`}
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ol>

            <div className={STICKY_ACTIONS}>
              <button
                type="button"
                onClick={save}
                disabled={!changed || kept.length === 0 || processing}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {kept.length === 0
                  ? "Keep at least one page"
                  : !changed
                    ? "Make a change first"
                    : `Save PDF (${kept.length} page${kept.length === 1 ? "" : "s"})`}
              </button>
            </div>
          </section>
        </>
      )}

      {result && (
        <section
          aria-label="Your organized PDF"
          className="flex flex-wrap items-center gap-4 rounded-2xl border border-green-200 bg-green-50 p-5"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900">{result.name}</p>
            <p className="text-sm text-slate-600">
              {result.pages} pages · {formatBytes(result.blob.size)}
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
            <NextSteps files={[blobToFile(result.blob, result.name)]} kind="pdf" current="/organize-pdf" />
          </div>
        </section>
      )}
    </div>
  );
}
