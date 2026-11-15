"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, Loader2, RotateCcw } from "lucide-react";
import Dropzone from "@/components/Dropzone";
import NextSteps from "@/components/NextSteps";
import { useHandoff } from "@/hooks/useHandoff";
import { blobToFile } from "@/lib/handoff";
import { STICKY_ACTIONS } from "@/lib/ui";
import FileList from "@/components/FileList";
import { useFileItems } from "@/hooks/useFileItems";
import { displayName, formatBytes, safeDownloadName } from "@/lib/files";
import { downloadBlob } from "@/lib/download";
import { describePdfError, mergePdfs, readPdfPageCount } from "@/lib/mergePdf";

const MAX_FILES = 30;

type Info = { pages: number } | { error: string };
type Result = { blob: Blob; url: string; name: string; pageCount: number };

export default function MergePdfTool() {
  const { items, add, remove, move, moveTo, update, clear } = useFileItems();
  const [info, setInfo] = useState<Record<string, Info>>({});
  const [fileName, setFileName] = useState("merged");

  const [result, setResult] = useState<Result | null>(null);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const cancelRef = useRef(false);
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
    setStatus("");
    setErrors([]);
  }

  function handleFiles(files: File[]) {
    clearResult();
    const added = add(files);
    for (const item of added) {
      update(item.id, { detail: "Reading…" });
      readPdfPageCount(item.file)
        .then((pages) => {
          setInfo((m) => ({ ...m, [item.id]: { pages } }));
          update(item.id, { detail: `${pages} page${pages === 1 ? "" : "s"}` });
        })
        .catch((e) => {
          const error = describePdfError(e);
          setInfo((m) => ({ ...m, [item.id]: { error } }));
          update(item.id, { detail: `⚠ ${error.startsWith("is password") ? "Password-protected" : "Can't be read"}` });
        });
    }
  }

  // Files sent from the homepage or another tool
  useHandoff((files) => handleFiles(files.slice(0, MAX_FILES)));

  function startOver() {
    clearResult();
    clear();
    setInfo({});
    setFileName("merged");
  }

  const states = items.map((i) => info[i.id]);
  const stillReading = states.some((s) => s === undefined);
  const badItems = items.filter((i) => {
    const s = info[i.id];
    return s !== undefined && "error" in s;
  });
  const totalPages = states.reduce((sum, s) => sum + (s && "pages" in s ? s.pages : 0), 0);
  const totalBytes = items.reduce((sum, i) => sum + i.file.size, 0);
  const canMerge = items.length >= 2 && !stillReading && badItems.length === 0 && !processing;

  async function merge() {
    clearResult();
    cancelRef.current = false;
    setProcessing(true);
    const name = safeDownloadName(fileName.trim() || "merged", "pdf");
    try {
      const out = await mergePdfs(
        items.map((i) => i.file),
        name.replace(/\.pdf$/, ""),
        (done, total) => setStatus(done < total ? `Merging file ${done + 1} of ${total}…` : "Saving PDF…"),
        () => cancelRef.current,
      );
      if (!out) {
        setStatus("Cancelled. No PDF was created.");
        return;
      }
      const url = URL.createObjectURL(out.blob);
      resultUrl.current = url;
      setResult({ blob: out.blob, url, name, pageCount: out.pageCount });
      setStatus(`Merged ${items.length} files into ${out.pageCount} pages.`);
    } catch (e) {
      setStatus("");
      setErrors([e instanceof Error ? e.message : "Something went wrong while merging."]);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <Dropzone
        accept={["pdf"]}
        currentCount={items.length}
        maxFiles={MAX_FILES}
        maxSizeMB={50}
        onFiles={handleFiles}
        title="Drop PDF files here"
      />

      <FileList
        items={items}
        onMoveTo={(id, to) => {
          clearResult();
          moveTo(id, to);
        }}
        onMove={(id, dir) => {
          clearResult();
          move(id, dir);
        }}
        onRemove={(id) => {
          clearResult();
          remove(id);
        }}
      />

      {badItems.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {badItems.map((i) => {
            const s = info[i.id];
            return (
              <li key={i.id}>
                &quot;{displayName(i.file.name)}&quot; {s && "error" in s ? s.error : ""} Remove it to continue.
              </li>
            );
          })}
        </ul>
      )}

      {items.length > 0 && (
        <section aria-labelledby="merge-settings" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 id="merge-settings" className="text-lg font-semibold text-slate-900">
            Merge settings
          </h2>

          <p className="text-sm text-slate-700">
            {items.length} file{items.length === 1 ? "" : "s"} · {totalPages} page{totalPages === 1 ? "" : "s"} ·{" "}
            {formatBytes(totalBytes)}
            {items.length < 2 && <span className="text-slate-500"> · add at least one more PDF</span>}
          </p>

          <div className="max-w-sm">
            <label htmlFor="merge-name" className="block text-sm font-medium text-slate-700">
              File name
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="merge-name"
                type="text"
                value={fileName}
                maxLength={80}
                onChange={(e) => {
                  clearResult();
                  setFileName(e.target.value);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <span className="text-sm text-slate-500">.pdf</span>
            </div>
          </div>

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
                onClick={merge}
                disabled={!canMerge}
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {stillReading ? "Reading files…" : "Merge PDFs"}
              </button>
            )}
            <button
              type="button"
              onClick={startOver}
              disabled={processing}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Start over
            </button>
          </div>
        </section>
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

      {result && (
        <section
          aria-label="Your merged PDF"
          className="flex flex-wrap items-center gap-4 rounded-2xl border border-green-200 bg-green-50 p-5"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900">{result.name}</p>
            <p className="text-sm text-slate-600">
              {result.pageCount} pages · {formatBytes(result.blob.size)}
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
            <NextSteps files={[blobToFile(result.blob, result.name)]} kind="pdf" current="/merge-pdf" />
          </div>
        </section>
      )}
    </div>
  );
}
