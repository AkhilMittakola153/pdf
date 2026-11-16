"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2, RotateCcw } from "lucide-react";
import Dropzone from "@/components/Dropzone";
import FileList from "@/components/FileList";
import NextSteps from "@/components/NextSteps";
import Segmented, { type Option } from "@/components/Segmented";
import { useFileItems } from "@/hooks/useFileItems";
import { useHandoff } from "@/hooks/useHandoff";
import { convertImage, type TargetFormat } from "@/lib/convertImage";
import { downloadBlob, downloadZip } from "@/lib/download";
import { baseName, displayName, formatBytes, safeDownloadName } from "@/lib/files";
import { blobToFile } from "@/lib/handoff";
import { getImageSize, mimeToExt } from "@/lib/image";
import { STICKY_ACTIONS } from "@/lib/ui";

const MAX_FILES = 30;

const FORMATS: Option<TargetFormat>[] = [
  { value: "image/jpeg", label: "JPG" },
  { value: "image/png", label: "PNG" },
  { value: "image/webp", label: "WebP" },
];

const FORMAT_HINT: Record<TargetFormat, string> = {
  "image/jpeg": "Best for photos. Small files, accepted everywhere. No transparency.",
  "image/png": "Best for logos, screenshots and text. Sharp, keeps transparency, larger files.",
  "image/webp": "Modern format: small files and keeps transparency. Supported by all current browsers.",
};

const BACKGROUNDS = [
  { value: "#ffffff", label: "White" },
  { value: "#000000", label: "Black" },
];

type Result = { id: string; name: string; blob: Blob; url: string; originalBytes: number; width: number; height: number };

export default function ConvertImageTool() {
  const { items, add, remove, move, moveTo, update, clear } = useFileItems({ preview: true });
  const [format, setFormat] = useState<TargetFormat>("image/jpeg");
  const [quality, setQuality] = useState(90);
  const [background, setBackground] = useState("#ffffff");

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
      const type = item.file.type ? item.file.type.replace("image/", "").toUpperCase().replace("JPEG", "JPG") : "Image";
      getImageSize(item.file)
        .then((s) => update(item.id, { detail: `${type} · ${s.width} × ${s.height} px` }))
        .catch(() => update(item.id, { detail: "Could not read this image" }));
    }
  }

  // Images sent from the homepage or another tool
  useHandoff(handleFiles);

  function startOver() {
    clearResults();
    clear();
  }

  async function run() {
    clearResults();
    cancelRef.current = false;
    setProcessing(true);
    const out: Result[] = [];
    const errs: string[] = [];
    let fallback = false;
    let reduced = false;
    let cancelled = false;

    for (let i = 0; i < items.length; i++) {
      if (cancelRef.current) {
        cancelled = true;
        break;
      }
      const item = items[i];
      setStatus(`Converting image ${i + 1} of ${items.length}…`);
      await new Promise((r) => setTimeout(r, 0));
      try {
        const r = await convertImage(item.file, format, quality, background);
        if (r.fallback) fallback = true;
        if (r.reduced) reduced = true;
        const url = URL.createObjectURL(r.blob);
        urls.current.add(url);
        out.push({
          id: item.id,
          name: safeDownloadName(baseName(item.file.name), mimeToExt(r.blob.type)),
          blob: r.blob,
          url,
          originalBytes: item.file.size,
          width: r.width,
          height: r.height,
        });
      } catch {
        errs.push(`"${displayName(item.file.name)}" could not be converted.`);
      }
    }

    if (fallback) errs.push("Your browser cannot save WebP, so those images were saved as PNG instead.");
    if (reduced) errs.push("Some very large images were scaled down to about 16 megapixels so they work on all devices.");
    setResults(out);
    setErrors(errs);
    setStatus(cancelled ? `Cancelled after ${out.length} image(s).` : `Done: ${out.length} image(s) converted.`);
    setProcessing(false);
  }

  async function downloadAll() {
    setZipping(true);
    try {
      await downloadZip(results.map((r) => ({ name: r.name, blob: r.blob })), "converted-images.zip");
    } catch {
      setErrors(["Could not create the ZIP file. Try downloading images one by one."]);
    } finally {
      setZipping(false);
    }
  }

  const label = FORMATS.find((f) => f.value === format)?.label ?? "";

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
        <section aria-labelledby="cv-settings" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 id="cv-settings" className="text-lg font-semibold text-slate-900">
            Convert to
          </h2>

          <div>
            <Segmented
              legend="Format"
              name="cv-format"
              options={FORMATS}
              value={format}
              onChange={(v) => {
                clearResults();
                setFormat(v);
              }}
            />
            <p className="mt-2 text-sm text-slate-600">{FORMAT_HINT[format]}</p>
          </div>

          {format !== "image/png" && (
            <div className="max-w-md">
              <label htmlFor="cv-q" className="block text-sm font-medium text-slate-700">
                Quality: <span className="font-semibold">{quality}</span>
              </label>
              <input
                id="cv-q"
                type="range"
                min={50}
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

          {format === "image/jpeg" && (
            <fieldset>
              <legend className="text-sm font-medium text-slate-700">Background for transparent areas</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {BACKGROUNDS.map((b) => (
                  <label
                    key={b.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue-600 ${
                      background === b.value ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-300 text-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="cv-bg"
                      value={b.value}
                      checked={background === b.value}
                      onChange={() => {
                        clearResults();
                        setBackground(b.value);
                      }}
                      className="sr-only"
                    />
                    <span className="h-4 w-4 rounded-full border border-slate-300" style={{ background: b.value }} />
                    {b.label}
                  </label>
                ))}
              </div>
            </fieldset>
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
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Convert to {label}
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
        <section aria-labelledby="cv-results" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="cv-results" className="text-lg font-semibold text-slate-900">
              Converted images
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
            {results.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.url} alt="" className="h-14 w-14 shrink-0 rounded-md border border-slate-200 object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{displayName(r.name)}</p>
                  <p className="text-xs text-slate-500">
                    {formatBytes(r.originalBytes)} → {formatBytes(r.blob.size)} · {r.width}×{r.height} px
                  </p>
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
            ))}
          </ul>
          <NextSteps files={results.map((r) => blobToFile(r.blob, r.name))} kind="image" current="/convert-image" />
        </section>
      )}
    </div>
  );
}
