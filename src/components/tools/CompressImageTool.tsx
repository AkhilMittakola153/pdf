"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Loader2, RotateCcw, TriangleAlert } from "lucide-react";
import Dropzone from "@/components/Dropzone";
import FileList from "@/components/FileList";
import NextSteps from "@/components/NextSteps";
import Segmented, { type Option } from "@/components/Segmented";
import { useFileItems } from "@/hooks/useFileItems";
import { useHandoff } from "@/hooks/useHandoff";
import { compressImage, type CompressFormat } from "@/lib/compressImage";
import { downloadBlob, downloadZip } from "@/lib/download";
import { baseName, displayName, formatBytes, safeDownloadName } from "@/lib/files";
import { blobToFile } from "@/lib/handoff";
import { getImageSize, mimeToExt } from "@/lib/image";
import { STICKY_ACTIONS } from "@/lib/ui";

const MAX_FILES = 30;
const TARGETS = [20, 50, 100, 200, 500]; // KB, common limits on application forms

type Mode = "target" | "quality";
const MODES: Option<Mode>[] = [
  { value: "target", label: "Target size" },
  { value: "quality", label: "Quality" },
];

type Result = {
  id: string;
  name: string;
  blob: Blob;
  url: string;
  originalBytes: number;
  width: number;
  height: number;
  reached: boolean;
  kept: boolean;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";

export default function CompressImageTool() {
  const { items, add, remove, move, moveTo, update, clear } = useFileItems({ preview: true });
  const [mode, setMode] = useState<Mode>("target");
  const [targetKB, setTargetKB] = useState(100);
  const [quality, setQuality] = useState(75);
  const [format, setFormat] = useState<CompressFormat>("image/jpeg");

  const [results, setResults] = useState<Result[]>([]);
  const [processing, setProcessing] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const cancelRef = useRef(false);
  const urls = useRef<Set<string>>(new Set());

  useEffect(() => {
    const set = urls.current;
    return () => set.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  function clearResults() {
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current.clear();
    setResults([]);
    setStatus("");
    setErrors([]);
  }

  function handleFiles(files: File[]) {
    clearResults();
    const added = add(files.slice(0, MAX_FILES - items.length));
    for (const item of added) {
      getImageSize(item.file)
        .then((s) => update(item.id, { detail: `${s.width} × ${s.height} px` }))
        .catch(() => update(item.id, { detail: "Could not read this image" }));
    }
  }

  // Images sent from the homepage or another tool
  useHandoff(handleFiles);

  function startOver() {
    clearResults();
    clear();
  }

  const settingsValid = mode === "quality" || (targetKB >= 5 && targetKB <= 50000);

  async function run() {
    clearResults();
    cancelRef.current = false;
    setProcessing(true);
    const out: Result[] = [];
    const errs: string[] = [];
    let fallback = false;
    let cancelled = false;

    for (let i = 0; i < items.length; i++) {
      if (cancelRef.current) {
        cancelled = true;
        break;
      }
      const item = items[i];
      setStatus(`Compressing image ${i + 1} of ${items.length}…`);
      await new Promise((r) => setTimeout(r, 0));
      try {
        const r = await compressImage(
          item.file,
          mode === "target" ? { mode, targetKB, format } : { mode, quality, format },
        );
        if (r.formatFallback) fallback = true;
        const url = URL.createObjectURL(r.blob);
        urls.current.add(url);
        const ext = r.keptOriginal ? mimeToExt(item.file.type) : mimeToExt(r.blob.type);
        out.push({
          id: item.id,
          name: safeDownloadName(`${baseName(item.file.name)}-compressed`, ext),
          blob: r.blob,
          url,
          originalBytes: item.file.size,
          width: r.width,
          height: r.height,
          reached: r.reachedTarget,
          kept: r.keptOriginal,
        });
      } catch {
        errs.push(`"${displayName(item.file.name)}" could not be compressed.`);
      }
    }

    if (fallback) errs.push("Your browser cannot save WebP, so JPG was used instead.");
    setResults(out);
    setErrors(errs);
    setStatus(cancelled ? `Cancelled after ${out.length} image(s).` : `Done: ${out.length} image(s) compressed.`);
    setProcessing(false);
  }

  async function downloadAll() {
    setZipping(true);
    try {
      await downloadZip(results.map((r) => ({ name: r.name, blob: r.blob })), "compressed-images.zip");
    } catch {
      setErrors(["Could not create the ZIP file. Try downloading images one by one."]);
    } finally {
      setZipping(false);
    }
  }

  const change = <T,>(setter: (v: T) => void) => (v: T) => {
    clearResults();
    setter(v);
  };

  return (
    <div className="space-y-6">
      <Dropzone
        accept={["jpeg", "png", "webp"]}
        currentCount={items.length}
        maxFiles={MAX_FILES}
        maxSizeMB={30}
        onFiles={handleFiles}
        title="Drop images here"
      />

      <FileList
        items={items}
        onMoveTo={(id, to) => {
          clearResults();
          moveTo(id, to);
        }}
        onMove={(id, dir) => {
          clearResults();
          move(id, dir);
        }}
        onRemove={(id) => {
          clearResults();
          remove(id);
        }}
      />

      {items.length > 0 && (
        <section aria-labelledby="ci-settings" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 id="ci-settings" className="text-lg font-semibold text-slate-900">
            Compression settings
          </h2>

          <Segmented legend="Compress by" name="ci-mode" options={MODES} value={mode} onChange={change(setMode)} />

          {mode === "target" ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">Make each image smaller than:</p>
              <div className="flex flex-wrap gap-2">
                {TARGETS.map((kb) => (
                  <button
                    key={kb}
                    type="button"
                    onClick={() => change(setTargetKB)(kb)}
                    aria-pressed={targetKB === kb}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
                      targetKB === kb
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 text-slate-700 hover:border-blue-400 hover:bg-blue-50"
                    }`}
                  >
                    {kb} KB
                  </button>
                ))}
              </div>
              <div className="max-w-[12rem]">
                <label htmlFor="ci-kb" className="block text-sm font-medium text-slate-700">
                  Custom size (KB)
                </label>
                <input
                  id="ci-kb"
                  type="number"
                  inputMode="numeric"
                  min={5}
                  value={targetKB || ""}
                  onChange={(e) => change(setTargetKB)(Number(e.target.value))}
                  className={inputClass}
                />
              </div>
              <p className="text-xs text-slate-500">
                We keep the best quality that fits. Pixel size is reduced only if needed.
              </p>
            </div>
          ) : (
            <div className="max-w-md">
              <label htmlFor="ci-q" className="block text-sm font-medium text-slate-700">
                Quality: <span className="font-semibold">{quality}</span>
              </label>
              <input
                id="ci-q"
                type="range"
                min={10}
                max={100}
                value={quality}
                onChange={(e) => change(setQuality)(Number(e.target.value))}
                className="mt-3 w-full accent-blue-600"
              />
              <p className="mt-1 text-xs text-slate-500">70–80 gives a good balance of size and quality.</p>
            </div>
          )}

          <div className="max-w-xs">
            <label htmlFor="ci-format" className="block text-sm font-medium text-slate-700">
              Save as
            </label>
            <select
              id="ci-format"
              value={format}
              onChange={(e) => change(setFormat)(e.target.value as CompressFormat)}
              className={inputClass}
            >
              <option value="image/jpeg">JPG (works everywhere)</option>
              <option value="image/webp">WebP (smaller, keeps transparency)</option>
            </select>
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
                onClick={run}
                disabled={!settingsValid}
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Compress {items.length > 1 ? `${items.length} images` : "image"}
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

      {results.length > 0 && (
        <section aria-labelledby="ci-results" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="ci-results" className="text-lg font-semibold text-slate-900">
              Compressed images
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

          <ul className="divide-y divide-slate-200">
            {results.map((r) => {
              const pct = Math.round((1 - r.blob.size / r.originalBytes) * 100);
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.url} alt="" className="h-14 w-14 shrink-0 rounded-md border border-slate-200 object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{displayName(r.name)}</p>
                    <p className="text-xs text-slate-500">
                      {formatBytes(r.originalBytes)} → <span className="font-semibold text-slate-700">{formatBytes(r.blob.size)}</span>
                      {!r.kept && pct > 0 && ` (−${pct}%)`} · {r.width}×{r.height} px
                    </p>
                    {mode === "target" && (
                      <p
                        className={`mt-0.5 flex items-center gap-1 text-xs font-medium ${
                          r.reached ? "text-emerald-700" : "text-amber-700"
                        }`}
                      >
                        {r.reached ? (
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {r.kept
                          ? `Already under ${targetKB} KB, kept as is`
                          : r.reached
                            ? `Under ${targetKB} KB`
                            : `Couldn't reach ${targetKB} KB; this is the smallest possible`}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadBlob(r.blob, r.name)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Download
                  </button>
                </li>
              );
            })}
          </ul>

          <NextSteps files={results.map((r) => blobToFile(r.blob, r.name))} kind="image" current="/compress-image" />
        </section>
      )}
    </div>
  );
}
