"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2, RotateCcw } from "lucide-react";
import Dropzone from "@/components/Dropzone";
import NextSteps from "@/components/NextSteps";
import { useHandoff } from "@/hooks/useHandoff";
import { blobToFile } from "@/lib/handoff";
import { STICKY_ACTIONS } from "@/lib/ui";
import FileList from "@/components/FileList";
import { useFileItems } from "@/hooks/useFileItems";
import { baseName, displayName, formatBytes, safeDownloadName } from "@/lib/files";
import {
  getImageSize,
  mimeToExt,
  originalMime,
  resizeImageFile,
  type OutputMime,
  type Size,
} from "@/lib/image";
import { downloadBlob, downloadZip } from "@/lib/download";

type Mode = "percent" | "pixels";
type FormatChoice = "original" | OutputMime;

type Result = {
  id: string;
  name: string;
  blob: Blob;
  url: string;
  originalUrl?: string;
  originalBytes: number;
  before: Size;
  after: Size;
};

const MAX_FILES = 30;
const MAX_SIDE = 10000;
const PERCENT_PRESETS = [25, 50, 75];
const PIXEL_PRESETS = [
  { label: "1920 × 1080", width: 1920, height: 1080 },
  { label: "1280 × 720", width: 1280, height: 720 },
  { label: "1080 × 1080", width: 1080, height: 1080 },
  { label: "800 × 600", width: 800, height: 600 },
  { label: "640 × 480", width: 640, height: 480 },
];

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";
const chipClass =
  "rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:border-blue-400 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600";

function toInt(v: string): number {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

function sizeChange(before: number, after: number): string {
  if (before === 0) return "";
  const pct = Math.round((1 - after / before) * 100);
  return pct >= 0 ? `−${pct}%` : `+${Math.abs(pct)}%`;
}

export default function ResizeImageTool() {
  const { items, add, remove, move, moveTo, update, clear } = useFileItems({ preview: true });
  const [dims, setDims] = useState<Record<string, Size>>({});

  const [mode, setMode] = useState<Mode>("percent");
  const [percent, setPercent] = useState(50);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [keepRatio, setKeepRatio] = useState(true);
  const [format, setFormat] = useState<FormatChoice>("original");
  const [quality, setQuality] = useState(85);

  const [results, setResults] = useState<Result[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const cancelRef = useRef(false);
  const resultUrls = useRef<Set<string>>(new Set());

  // Free result images from memory when leaving the page
  useEffect(() => {
    const set = resultUrls.current;
    return () => {
      set.forEach((u) => URL.revokeObjectURL(u));
      set.clear();
    };
  }, []);

  const firstDims = items.length > 0 ? dims[items[0].id] : undefined;

  // Any change to files or settings makes old results out of date
  function clearResults() {
    resultUrls.current.forEach((u) => URL.revokeObjectURL(u));
    resultUrls.current.clear();
    setResults([]);
    setSelectedId(null);
    setStatus("");
    setErrors([]);
  }

  function handleFiles(files: File[]) {
    clearResults();
    const added = add(files);
    for (const item of added) {
      getImageSize(item.file)
        .then((size) => {
          setDims((d) => ({ ...d, [item.id]: size }));
          update(item.id, { detail: `${size.width} × ${size.height} px` });
        })
        .catch(() => update(item.id, { detail: "Could not read this image" }));
    }
  }

  // Files sent from the homepage or another tool
  useHandoff((files) => handleFiles(files.slice(0, MAX_FILES)));

  function startOver() {
    clearResults();
    clear();
    setDims({});
  }

  function changeMode(m: Mode) {
    clearResults();
    setMode(m);
    if (m === "pixels" && !width && firstDims) {
      setWidth(String(firstDims.width));
      setHeight(String(firstDims.height));
    }
  }

  function onWidthChange(v: string) {
    clearResults();
    setWidth(v);
    const w = toInt(v);
    if (keepRatio && firstDims && w > 0) {
      setHeight(String(Math.max(1, Math.round((w * firstDims.height) / firstDims.width))));
    }
  }

  function onHeightChange(v: string) {
    clearResults();
    setHeight(v);
    const h = toInt(v);
    if (keepRatio && firstDims && h > 0) {
      setWidth(String(Math.max(1, Math.round((h * firstDims.width) / firstDims.height))));
    }
  }

  function applyPreset(w: number, h: number) {
    clearResults();
    setWidth(String(w));
    setHeight(String(h));
  }

  /** New size for one image, or null if the settings are incomplete. */
  function computeTarget(src: Size): Size | null {
    if (mode === "percent") {
      const s = percent / 100;
      return {
        width: Math.max(1, Math.round(src.width * s)),
        height: Math.max(1, Math.round(src.height * s)),
      };
    }
    const w = toInt(width);
    const h = toInt(height);
    if (w < 1 || h < 1 || w > MAX_SIDE || h > MAX_SIDE) return null;
    if (keepRatio) {
      // Fit inside the w × h box without stretching
      const s = Math.min(w / src.width, h / src.height);
      return {
        width: Math.max(1, Math.round(src.width * s)),
        height: Math.max(1, Math.round(src.height * s)),
      };
    }
    return { width: w, height: h };
  }

  const settingsValid =
    mode === "percent"
      ? percent >= 1 && percent <= 400
      : toInt(width) >= 1 && toInt(height) >= 1 && toInt(width) <= MAX_SIDE && toInt(height) <= MAX_SIDE;

  const firstTarget = firstDims ? computeTarget(firstDims) : null;

  async function processAll() {
    clearResults();
    cancelRef.current = false;
    setProcessing(true);

    const out: Result[] = [];
    const errs: string[] = [];
    let webpFallback = false;
    let cancelled = false;

    for (let i = 0; i < items.length; i++) {
      if (cancelRef.current) {
        cancelled = true;
        break;
      }
      const item = items[i];
      setStatus(`Resizing image ${i + 1} of ${items.length}…`);
      await new Promise((r) => setTimeout(r, 0)); // let the screen update

      try {
        const before = dims[item.id] ?? (await getImageSize(item.file));
        const target = computeTarget(before);
        if (!target) throw new Error("enter a valid width and height.");
        const type = format === "original" ? originalMime(item.file) : format;
        const blob = await resizeImageFile(item.file, target, type, quality);
        if (type === "image/webp" && blob.type !== "image/webp") webpFallback = true;

        const url = URL.createObjectURL(blob);
        resultUrls.current.add(url);
        out.push({
          id: item.id,
          name: safeDownloadName(
            `${baseName(item.file.name)}-${target.width}x${target.height}`,
            mimeToExt(blob.type),
          ),
          blob,
          url,
          originalUrl: item.previewUrl,
          originalBytes: item.file.size,
          before,
          after: target,
        });
      } catch (e) {
        const reason = e instanceof Error ? e.message : "could not be resized.";
        errs.push(`"${displayName(item.file.name)}": ${reason}`);
      }
    }

    if (webpFallback) errs.push("Your browser cannot save WebP, so those images were saved as PNG instead.");
    setResults(out);
    setSelectedId(out[0]?.id ?? null);
    setErrors(errs);
    setStatus(
      cancelled
        ? `Cancelled. ${out.length} image(s) were resized before stopping.`
        : `Done: ${out.length} of ${items.length} image(s) resized.`,
    );
    setProcessing(false);
  }

  async function downloadAll() {
    setZipping(true);
    try {
      await downloadZip(
        results.map((r) => ({ name: r.name, blob: r.blob })),
        "resized-images.zip",
      );
    } catch {
      setErrors(["Could not create the ZIP file. Try downloading images one by one."]);
    } finally {
      setZipping(false);
    }
  }

  const selected = results.find((r) => r.id === selectedId) ?? null;
  const showQuality = format === "image/jpeg" || format === "image/webp" || format === "original";

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
        <section aria-labelledby="settings-heading" className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 id="settings-heading" className="text-lg font-semibold text-slate-900">
            Resize settings
          </h2>

          <fieldset>
            <legend className="text-sm font-medium text-slate-700">Resize by</legend>
            <div className="mt-2 inline-flex rounded-lg border border-slate-300 p-1">
              {(["percent", "pixels"] as Mode[]).map((m) => (
                <label
                  key={m}
                  className={`cursor-pointer rounded-md px-4 py-2 text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue-600 ${
                    mode === m ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <input
                    type="radio"
                    name="resize-mode"
                    value={m}
                    checked={mode === m}
                    onChange={() => changeMode(m)}
                    className="sr-only"
                  />
                  {m === "percent" ? "Percentage" : "Pixels"}
                </label>
              ))}
            </div>
          </fieldset>

          {mode === "percent" ? (
            <div className="space-y-3">
              <label htmlFor="percent" className="block text-sm font-medium text-slate-700">
                Scale: <span className="font-semibold text-slate-900">{percent}%</span> of original size
              </label>
              <input
                id="percent"
                type="range"
                min={1}
                max={200}
                value={percent}
                onChange={(e) => {
                  clearResults();
                  setPercent(Number(e.target.value));
                }}
                className="w-full accent-blue-600"
              />
              <div className="flex flex-wrap gap-2">
                {PERCENT_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={chipClass}
                    onClick={() => {
                      clearResults();
                      setPercent(p);
                    }}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="width" className="block text-sm font-medium text-slate-700">
                    Width (px)
                  </label>
                  <input
                    id="width"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MAX_SIDE}
                    value={width}
                    onChange={(e) => onWidthChange(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="height" className="block text-sm font-medium text-slate-700">
                    Height (px)
                  </label>
                  <input
                    id="height"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MAX_SIDE}
                    value={height}
                    onChange={(e) => onHeightChange(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={keepRatio}
                  onChange={(e) => {
                    clearResults();
                    setKeepRatio(e.target.checked);
                  }}
                  className="h-4 w-4 accent-blue-600"
                />
                Keep aspect ratio (no stretching)
              </label>
              {items.length > 1 && keepRatio && (
                <p className="text-xs text-slate-500">Each image is scaled to fit inside this width and height.</p>
              )}
              <div className="flex flex-wrap gap-2">
                {PIXEL_PRESETS.map((p) => (
                  <button key={p.label} type="button" className={chipClass} onClick={() => applyPreset(p.width, p.height)}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="format" className="block text-sm font-medium text-slate-700">
                Output format
              </label>
              <select
                id="format"
                value={format}
                onChange={(e) => {
                  clearResults();
                  setFormat(e.target.value as FormatChoice);
                }}
                className={inputClass}
              >
                <option value="original">Same as original</option>
                <option value="image/jpeg">JPG</option>
                <option value="image/png">PNG</option>
                <option value="image/webp">WebP</option>
              </select>
            </div>
            {showQuality && (
              <div>
                <label htmlFor="quality" className="block text-sm font-medium text-slate-700">
                  Quality: <span className="font-semibold text-slate-900">{quality}</span>
                  {format === "original" && <span className="text-slate-500"> (JPG/WebP only)</span>}
                </label>
                <input
                  id="quality"
                  type="range"
                  min={10}
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

          {firstDims && firstTarget && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              First image: {firstDims.width} × {firstDims.height} px →{" "}
              <span className="font-semibold">
                {firstTarget.width} × {firstTarget.height} px
              </span>
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
                onClick={processAll}
                disabled={!settingsValid}
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Resize {items.length > 1 ? `${items.length} images` : "image"}
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

      {/* Progress and results are announced to screen readers */}
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
        <section aria-labelledby="results-heading" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="results-heading" className="text-lg font-semibold text-slate-900">
              Resized images
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

          {selected && (
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: "Before", url: selected.originalUrl, size: selected.before, bytes: selected.originalBytes },
                { label: "After", url: selected.url, size: selected.after, bytes: selected.blob.size },
              ].map((side) => (
                <figure key={side.label} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex h-56 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                    {side.url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={side.url} alt={`${side.label}: ${selected.name}`} className="max-h-full max-w-full object-contain" />
                    )}
                  </div>
                  <figcaption className="mt-2 text-sm text-slate-700">
                    <span className="font-semibold">{side.label}</span> · {side.size.width} × {side.size.height} px ·{" "}
                    {formatBytes(side.bytes)}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}

          <ul className="divide-y divide-slate-200">
            {results.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{displayName(r.name)}</p>
                  <p className="text-xs text-slate-500">
                    {r.before.width}×{r.before.height} → {r.after.width}×{r.after.height} px ·{" "}
                    {formatBytes(r.originalBytes)} → {formatBytes(r.blob.size)} ({sizeChange(r.originalBytes, r.blob.size)})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  aria-pressed={selectedId === r.id}
                  className="rounded-md px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50"
                >
                  Preview
                </button>
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

          <NextSteps files={results.map((r) => blobToFile(r.blob, r.name))} kind="image" current="/resize-image" />
        </section>
      )}
    </div>
  );
}
