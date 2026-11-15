"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import Dropzone from "@/components/Dropzone";
import NextSteps from "@/components/NextSteps";
import PdfFileCard from "@/components/PdfFileCard";
import Segmented, { type Option } from "@/components/Segmented";
import { useHandoff } from "@/hooks/useHandoff";
import { usePdfPages } from "@/hooks/usePdfPages";
import { downloadBlob, downloadZip } from "@/lib/download";
import { baseName, formatBytes, safeDownloadName } from "@/lib/files";
import { blobToFile } from "@/lib/handoff";
import { chunkPages, describeGroup, parseRangeGroups, splitPdf } from "@/lib/pdfPages";
import { parsePageRange } from "@/lib/pdfRender";
import { STICKY_ACTIONS } from "@/lib/ui";

type Mode = "extract" | "ranges" | "every";
const MODES: Option<Mode>[] = [
  { value: "extract", label: "Extract pages" },
  { value: "ranges", label: "Split by ranges" },
  { value: "every", label: "Every N pages" },
];
const MAX_PARTS = 300;

type Part = { pages: number[]; name: string; blob: Blob; url: string };

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";
const chip = "rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:border-blue-400 hover:bg-blue-50";

export default function SplitPdfTool() {
  const pdf = usePdfPages();
  const [mode, setMode] = useState<Mode>("extract");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [rangeText, setRangeText] = useState("");
  const [everyN, setEveryN] = useState(1);

  const [parts, setParts] = useState<Part[]>([]);
  const [processing, setProcessing] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const cancelRef = useRef(false);
  const urls = useRef<Set<string>>(new Set());

  useEffect(() => {
    const set = urls.current;
    return () => set.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  function clearResults() {
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current.clear();
    setParts([]);
    setStatus("");
    setError("");
  }

  function handleFiles(files: File[]) {
    if (!files[0]) return;
    clearResults();
    setSelected(new Set());
    setRangeText("");
    void pdf.open(files[0]);
  }

  // A PDF sent from the homepage or another tool
  useHandoff(handleFiles);

  function reset() {
    clearResults();
    setSelected(new Set());
    setRangeText("");
    pdf.reset();
  }

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
    setSelected(on ? new Set(Array.from({ length: pdf.pageCount }, (_, i) => i + 1)) : new Set());
  }

  // Work out which new files will be created, from the current settings
  let groups: number[][] | null = null;
  let hint = "";
  if (pdf.pageCount > 0) {
    if (mode === "extract") {
      const typed = rangeText.trim() ? parsePageRange(rangeText, pdf.pageCount) : null;
      const pages = rangeText.trim() ? typed : [...selected].sort((a, b) => a - b);
      if (rangeText.trim() && !typed) hint = `Enter pages like 1-3, 5 (between 1 and ${pdf.pageCount}).`;
      else if (pages && pages.length > 0) groups = [pages];
      else hint = "Tap pages to select them, or type a range.";
    } else if (mode === "ranges") {
      groups = parseRangeGroups(rangeText, pdf.pageCount);
      if (!groups) hint = `Enter ranges like 1-3, 4-8, 9 (between 1 and ${pdf.pageCount}). Each range becomes a file.`;
    } else {
      const n = Math.floor(everyN);
      if (n >= 1 && n <= pdf.pageCount) groups = chunkPages(pdf.pageCount, n);
      else hint = `Enter a number from 1 to ${pdf.pageCount}.`;
    }
    if (groups && groups.length > MAX_PARTS) {
      hint = `That would create ${groups.length} files. Please keep it to ${MAX_PARTS} or fewer.`;
      groups = null;
    }
  }

  async function run() {
    if (!pdf.file || !groups) return;
    clearResults();
    cancelRef.current = false;
    setProcessing(true);
    const base = baseName(pdf.file.name);
    try {
      const out = await splitPdf(
        pdf.file,
        groups,
        (done, total) => setStatus(done < total ? `Creating file ${done + 1} of ${total}…` : "Finishing…"),
        () => cancelRef.current,
      );
      if (!out) {
        setStatus("Cancelled.");
        return;
      }
      const made = out.map((part, i) => {
        const label =
          mode === "extract"
            ? "extracted"
            : part.pages.length === 1
              ? `page-${part.pages[0]}`
              : describeGroup(part.pages).includes(",")
                ? `part-${i + 1}`
                : `pages-${part.pages[0]}-${part.pages[part.pages.length - 1]}`;
        const url = URL.createObjectURL(part.blob);
        urls.current.add(url);
        return { pages: part.pages, blob: part.blob, url, name: safeDownloadName(`${base}-${label}`, "pdf") };
      });
      setParts(made);
      setStatus(`Done: ${made.length} PDF${made.length === 1 ? "" : "s"} created.`);
    } catch (e) {
      setStatus("");
      setError(e instanceof Error ? e.message : "Something went wrong while splitting.");
    } finally {
      setProcessing(false);
    }
  }

  async function downloadAll() {
    if (!pdf.file) return;
    setZipping(true);
    try {
      await downloadZip(
        parts.map((p) => ({ name: p.name, blob: p.blob })),
        safeDownloadName(`${baseName(pdf.file.name)}-split`, "zip"),
      );
    } catch {
      setError("Could not create the ZIP file. Try downloading files one by one.");
    } finally {
      setZipping(false);
    }
  }

  const actionLabel =
    mode === "extract"
      ? `Extract ${groups ? groups[0].length : 0} page${groups && groups[0].length === 1 ? "" : "s"}`
      : `Split into ${groups ? groups.length : 0} file${groups && groups.length === 1 ? "" : "s"}`;

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

      {pdf.error && (
        <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {pdf.error}
        </p>
      )}

      {pdf.file && (
        <>
          <PdfFileCard file={pdf.file} pageCount={pdf.pageCount} onReset={reset} disabled={processing} />

          <section aria-labelledby="split-heading" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 id="split-heading" className="text-lg font-semibold text-slate-900">
              How do you want to split?
            </h2>

            <Segmented
              legend="Mode"
              name="split-mode"
              options={MODES}
              value={mode}
              onChange={(v) => {
                clearResults();
                setMode(v);
                setRangeText("");
              }}
            />

            {mode === "every" ? (
              <div className="max-w-xs">
                <label htmlFor="every-n" className="block text-sm font-medium text-slate-700">
                  Pages per file
                </label>
                <input
                  id="every-n"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={pdf.pageCount}
                  value={everyN || ""}
                  onChange={(e) => {
                    clearResults();
                    setEveryN(Number(e.target.value));
                  }}
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-slate-500">Use 1 to save every page as its own PDF.</p>
              </div>
            ) : (
              <div className="max-w-md">
                <label htmlFor="ranges" className="block text-sm font-medium text-slate-700">
                  {mode === "extract" ? "Page range (optional)" : "Ranges"}
                </label>
                <input
                  id="ranges"
                  type="text"
                  value={rangeText}
                  onChange={(e) => {
                    clearResults();
                    setRangeText(e.target.value);
                  }}
                  placeholder={mode === "extract" ? "e.g. 1-3, 5" : "e.g. 1-3, 4-8, 9"}
                  className={inputClass}
                />
              </div>
            )}

            {/* Preview of the files that will be created */}
            {groups ? (
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {groups.length === 1 ? (
                  <p>
                    Creates <span className="font-semibold">1 PDF</span> with {describeGroup(groups[0])}.
                  </p>
                ) : (
                  <>
                    <p>
                      Creates <span className="font-semibold">{groups.length} PDFs</span>:
                    </p>
                    <ul className="mt-1 list-disc pl-5 text-slate-600">
                      {groups.slice(0, 5).map((g, i) => (
                        <li key={i}>
                          File {i + 1}: {describeGroup(g)}
                        </li>
                      ))}
                      {groups.length > 5 && <li>…and {groups.length - 5} more</li>}
                    </ul>
                  </>
                )}
              </div>
            ) : (
              hint && <p className="text-sm text-amber-700">{hint}</p>
            )}

            {mode === "extract" && !rangeText.trim() && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-700">{selected.size} selected</p>
                  <div className="flex gap-2">
                    <button type="button" className={chip} onClick={() => selectAll(true)}>
                      Select all
                    </button>
                    <button type="button" className={chip} onClick={() => selectAll(false)}>
                      Select none
                    </button>
                  </div>
                </div>
                <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-6">
                  {Array.from({ length: pdf.pageCount }, (_, i) => i + 1).map((p) => {
                    const on = selected.has(p);
                    return (
                      <li key={p}>
                        <button
                          type="button"
                          onClick={() => togglePage(p)}
                          aria-pressed={on}
                          aria-label={`Page ${p}${on ? ", selected" : ""}`}
                          className={`block w-full rounded-lg border-2 p-1 text-center transition focus-visible:outline-2 focus-visible:outline-blue-600 ${
                            on ? "border-blue-600 bg-blue-50" : "border-transparent opacity-70 hover:opacity-100"
                          }`}
                        >
                          <span className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded bg-slate-100">
                            {pdf.thumbs[p] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={pdf.thumbs[p]} alt="" className="max-h-full max-w-full object-contain" />
                            ) : (
                              <span className="text-xs text-slate-500">{p}</span>
                            )}
                          </span>
                          <span className="mt-1 block text-xs text-slate-600">{p}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
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
                  onClick={run}
                  disabled={!groups}
                  className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLabel}
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

      {error && (
        <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {error}
        </p>
      )}

      {parts.length > 0 && (
        <section aria-labelledby="parts-heading" className="space-y-4 rounded-2xl border border-green-200 bg-green-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="parts-heading" className="text-lg font-semibold text-slate-900">
              Your PDF{parts.length === 1 ? "" : "s"}
            </h2>
            {parts.length > 1 && (
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
          <ul className="divide-y divide-green-200 rounded-xl border border-green-200 bg-white">
            {parts.slice(0, 50).map((p) => (
              <li key={p.name} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-500">
                    {describeGroup(p.pages)} · {formatBytes(p.blob.size)}
                  </p>
                </div>
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-700 hover:underline">
                  Open
                </a>
                <button
                  type="button"
                  onClick={() => downloadBlob(p.blob, p.name)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download
                </button>
              </li>
            ))}
          </ul>
          {parts.length > 50 && (
            <p className="text-sm text-slate-600">Showing 50 of {parts.length}. Use “Download all (ZIP)” to get every file.</p>
          )}
          <NextSteps files={parts.map((p) => blobToFile(p.blob, p.name))} kind="pdf" current="/split-pdf" />
        </section>
      )}
    </div>
  );
}
