"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, ExternalLink, Loader2, TriangleAlert } from "lucide-react";
import Dropzone from "@/components/Dropzone";
import NextSteps from "@/components/NextSteps";
import PdfFileCard from "@/components/PdfFileCard";
import { useHandoff } from "@/hooks/useHandoff";
import { compressPdf, LEVELS, type Level } from "@/lib/compressPdf";
import { downloadBlob } from "@/lib/download";
import { baseName, formatBytes, safeDownloadName } from "@/lib/files";
import { blobToFile } from "@/lib/handoff";
import { describePdfError, readPdfPageCount } from "@/lib/mergePdf";
import { STICKY_ACTIONS } from "@/lib/ui";

type Result = { blob: Blob; url: string; name: string; imagesFound: number; imagesShrunk: number; level: Level };

export default function CompressPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [level, setLevel] = useState<Level>("balanced");
  const [result, setResult] = useState<Result | null>(null);
  const [opening, setOpening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
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
    setError("");
  }

  async function handleFiles(files: File[]) {
    const f = files[0];
    if (!f) return;
    clearResult();
    setFile(null);
    setOpening(true);
    try {
      setPageCount(await readPdfPageCount(f)); // also catches password-protected or broken PDFs
      setFile(f);
    } catch (e) {
      setError(`This PDF ${describePdfError(e)}`);
    } finally {
      setOpening(false);
    }
  }

  // A PDF sent from the homepage or another tool
  useHandoff((files) => void handleFiles(files));

  function reset() {
    clearResult();
    setFile(null);
    setPageCount(0);
  }

  async function run() {
    if (!file) return;
    clearResult();
    cancelRef.current = false;
    setProcessing(true);
    try {
      const out = await compressPdf(
        file,
        level,
        (done, total) =>
          setStatus(
            done < total
              ? level === "maximum"
                ? `Redrawing page ${done + 1} of ${total}…`
                : `Shrinking image ${done + 1} of ${total}…`
              : "Saving PDF…",
          ),
        () => cancelRef.current,
      );
      if (!out) {
        setStatus("Cancelled.");
        return;
      }
      const url = URL.createObjectURL(out.blob);
      resultUrl.current = url;
      setResult({
        ...out,
        url,
        level,
        name: safeDownloadName(`${baseName(file.name)}-compressed`, "pdf"),
      });
      setStatus("");
    } catch (e) {
      setStatus("");
      setError(e instanceof Error ? e.message : "Something went wrong while compressing.");
    } finally {
      setProcessing(false);
    }
  }

  const saved = result && file ? 1 - result.blob.size / file.size : 0;
  const worthIt = saved >= 0.03; // at least 3 % smaller

  return (
    <div className="space-y-6">
      {!file && !opening && (
        <Dropzone accept={["pdf"]} multiple={false} maxSizeMB={100} onFiles={handleFiles} title="Drop a PDF here" />
      )}

      {opening && (
        <p className="flex items-center gap-2 text-sm text-slate-700" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Opening PDF…
        </p>
      )}

      {file && (
        <>
          <PdfFileCard file={file} pageCount={pageCount} onReset={reset} disabled={processing} />

          <section aria-labelledby="level-heading" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 id="level-heading" className="text-lg font-semibold text-slate-900">
              Compression level
            </h2>

            <fieldset className="grid gap-3 sm:grid-cols-3">
              <legend className="sr-only">Compression level</legend>
              {(Object.keys(LEVELS) as Level[]).map((key) => {
                const l = LEVELS[key];
                const on = level === key;
                return (
                  <label
                    key={key}
                    className={`cursor-pointer rounded-xl border-2 p-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue-600 ${
                      on ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="level"
                      value={key}
                      checked={on}
                      onChange={() => {
                        clearResult();
                        setLevel(key);
                      }}
                      className="sr-only"
                    />
                    <span className="block font-semibold text-slate-900">
                      {l.label}
                      {key === "balanced" && (
                        <span className="ml-2 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                          Recommended
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-sm text-slate-600">{l.description}</span>
                    <span
                      className={`mt-2 flex items-center gap-1 text-xs font-medium ${
                        l.keepsText ? "text-emerald-700" : "text-amber-700"
                      }`}
                    >
                      {l.keepsText ? (
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {l.keepsText ? "Text stays selectable" : "Text can no longer be selected"}
                    </span>
                  </label>
                );
              })}
            </fieldset>

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
                  className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  Compress PDF
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

      {result && file && worthIt && (
        <section aria-label="Your compressed PDF" className="space-y-4 rounded-2xl border border-green-200 bg-green-50 p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-bold text-green-700">{Math.round(saved * 100)}% smaller</p>
              <p className="text-sm text-slate-700">
                {formatBytes(file.size)} → <span className="font-semibold">{formatBytes(result.blob.size)}</span>
              </p>
              <p className="mt-1 truncate text-xs text-slate-500">{result.name}</p>
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
          </div>
          <NextSteps files={[blobToFile(result.blob, result.name)]} kind="pdf" current="/compress-pdf" />
        </section>
      )}

      {result && file && !worthIt && (
        <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">This PDF is already well optimised.</p>
          <p className="mt-1">
            {result.level === "maximum"
              ? "Even as images, the file would not be meaningfully smaller. Your original is the best version."
              : result.imagesFound === 0
                ? "It has no photos that can be shrunk (it is mostly text or drawings). Try Maximum if it is a scanned document."
                : "Its images are already compressed. Try Strong, or Maximum if it is a scanned document."}
          </p>
        </div>
      )}
    </div>
  );
}
