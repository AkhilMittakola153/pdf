"use client";

import { useState } from "react";
import { Download, Loader2, RotateCcw, RotateCw } from "lucide-react";
import Dropzone from "@/components/Dropzone";
import ImageCropper from "@/components/ImageCropper";
import NextSteps from "@/components/NextSteps";
import Segmented, { type Option } from "@/components/Segmented";
import { useHandoff } from "@/hooks/useHandoff";
import { downloadBlob } from "@/lib/download";
import { blobToFile } from "@/lib/handoff";
import { baseName, displayName, formatBytes, safeDownloadName } from "@/lib/files";
import { MAX_CANVAS_AREA, mimeToExt, originalMime, type CropRect, type OutputMime } from "@/lib/image";
import { clampCrop, defaultCrop, loadImageSource, rotateSource } from "@/lib/idCard";
import { STICKY_ACTIONS } from "@/lib/ui";

type Photo = {
  file: File;
  base: HTMLCanvasElement;
  quarter: number;
  fine: number;
  source: HTMLCanvasElement;
  crop: CropRect;
  reduced: boolean;
};
type Result = { blob: Blob; name: string; width: number; height: number };

// Leave room for straightening, which makes the canvas a little bigger
const LOAD_AREA = Math.floor(MAX_CANVAS_AREA / 1.45);

const RATIOS: { id: string; label: string; value: number | null }[] = [
  { id: "free", label: "Free", value: null },
  { id: "1:1", label: "1:1 Square", value: 1 },
  { id: "4:3", label: "4:3", value: 4 / 3 },
  { id: "3:4", label: "3:4", value: 3 / 4 },
  { id: "16:9", label: "16:9", value: 16 / 9 },
  { id: "9:16", label: "9:16 Story", value: 9 / 16 },
  { id: "3:2", label: "3:2", value: 3 / 2 },
  { id: "custom", label: "Custom", value: null },
];

type FormatChoice = "same" | OutputMime;
const FORMATS: Option<FormatChoice>[] = [
  { value: "same", label: "Same as original" },
  { value: "image/jpeg", label: "JPG" },
  { value: "image/png", label: "PNG" },
  { value: "image/webp", label: "WebP" },
];

/** Keep the crop's centre and width, change its shape. */
function reshape(crop: CropRect, src: HTMLCanvasElement, aspect: number): CropRect {
  let w = crop.w;
  let h = w / aspect;
  if (h > src.height) {
    h = src.height;
    w = h * aspect;
  }
  if (w > src.width) {
    w = src.width;
    h = w / aspect;
  }
  return clampCrop({ x: crop.x + crop.w / 2 - w / 2, y: crop.y + crop.h / 2 - h / 2, w, h }, src);
}

function encode(canvas: HTMLCanvasElement, type: OutputMime) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("could not save the image."))), type, 0.92),
  );
}

export default function CropImageTool() {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [ratioId, setRatioId] = useState("free");
  const [customW, setCustomW] = useState("5");
  const [customH, setCustomH] = useState("4");
  const [format, setFormat] = useState<FormatChoice>("same");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const cw = Number(customW);
  const ch = Number(customH);
  const customOk = cw > 0 && ch > 0 && cw <= 100 && ch <= 100;
  const ratio = ratioId === "custom" ? (customOk ? cw / ch : null) : (RATIOS.find((r) => r.id === ratioId)?.value ?? null);

  function applyRatio(next: number | null) {
    if (next) setPhoto((p) => (p ? { ...p, crop: reshape(p.crop, p.source, next) } : p));
  }

  async function handleFiles(files: File[]) {
    const file = files[0];
    if (!file) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const bmp = await createImageBitmap(file);
      const area = bmp.width * bmp.height;
      bmp.close();
      const base = await loadImageSource(file, Infinity, null, LOAD_AREA);
      const crop = ratio ? defaultCrop(base, ratio) : defaultCrop(base, base.width / base.height);
      setPhoto({ file, base, quarter: 0, fine: 0, source: base, crop, reduced: area > LOAD_AREA });
    } catch {
      setError("This image could not be opened. Try a JPG, PNG or WebP image.");
    } finally {
      setBusy(false);
    }
  }

  useHandoff((files) => void handleFiles(files));

  function turn(by: number) {
    setResult(null);
    setPhoto((p) => {
      if (!p) return p;
      const quarter = (p.quarter + by + 4) % 4;
      const source = rotateSource(p.base, quarter, p.fine, null);
      return { ...p, quarter, source, crop: defaultCrop(source, ratio ?? source.width / source.height) };
    });
  }

  function straighten(fine: number) {
    setResult(null);
    setPhoto((p) => {
      if (!p) return p;
      const source = rotateSource(p.base, p.quarter, fine, null);
      return { ...p, fine, source, crop: clampCrop(p.crop, source) };
    });
  }

  async function crop() {
    if (!photo) return;
    setBusy(true);
    setError("");
    try {
      const type: OutputMime = format === "same" ? originalMime(photo.file) : format;
      const w = Math.max(1, Math.round(photo.crop.w));
      const h = Math.max(1, Math.round(photo.crop.h));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas is not available in this browser.");
      if (type === "image/jpeg") {
        ctx.fillStyle = "#ffffff"; // JPG has no transparency
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(photo.source, photo.crop.x, photo.crop.y, photo.crop.w, photo.crop.h, 0, 0, w, h);
      const blob = await encode(canvas, type);
      canvas.width = canvas.height = 0;
      // Browsers that can't write WebP silently return PNG; name the file by what we actually got
      const name = safeDownloadName(`${baseName(photo.file.name)}-cropped`, mimeToExt(blob.type || type));
      setResult({ blob, name, width: w, height: h });
      downloadBlob(blob, name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const btn =
    "inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

  return (
    <div className="space-y-6">
      {!photo ? (
        <Dropzone
          accept={["jpeg", "png", "webp"]}
          multiple={false}
          maxSizeMB={50}
          onFiles={(f) => void handleFiles(f)}
          title="Add an image to crop"
          hint="JPG, PNG or WebP · stays on your device"
        />
      ) : (
        <section aria-labelledby="crop-h" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="crop-h" className="text-lg font-semibold text-slate-900">
                Crop {displayName(photo.file.name, 40)}
              </h2>
              <p className="mt-1 text-sm text-slate-500">Drag the box to move it, and pull a corner to resize.</p>
            </div>
            <button
              type="button"
              className={btn}
              onClick={() => {
                setPhoto(null);
                setResult(null);
              }}
              disabled={busy}
            >
              Use another image
            </button>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">Shape</legend>
            <div className="flex flex-wrap gap-2">
              {RATIOS.map((r) => (
                <label
                  key={r.id}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-medium ${ratioId === r.id ? "border-blue-600 bg-blue-50 text-blue-800 ring-1 ring-blue-600" : "border-slate-300 bg-white text-slate-700"}`}
                >
                  <input
                    type="radio"
                    name="crop-ratio"
                    value={r.id}
                    checked={ratioId === r.id}
                    onChange={() => {
                      setRatioId(r.id);
                      applyRatio(r.id === "custom" ? (customOk ? cw / ch : null) : r.value);
                    }}
                    className="sr-only"
                  />
                  {r.label}
                </label>
              ))}
            </div>
            {ratioId === "custom" && (
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                <input
                  inputMode="decimal"
                  aria-label="Ratio width"
                  value={customW}
                  onChange={(e) => {
                    setCustomW(e.target.value);
                    const v = Number(e.target.value);
                    if (v > 0 && v <= 100 && ch > 0 && ch <= 100) applyRatio(v / ch);
                  }}
                  className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-base"
                />
                :
                <input
                  inputMode="decimal"
                  aria-label="Ratio height"
                  value={customH}
                  onChange={(e) => {
                    setCustomH(e.target.value);
                    const v = Number(e.target.value);
                    if (v > 0 && v <= 100 && cw > 0 && cw <= 100) applyRatio(cw / v);
                  }}
                  className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-base"
                />
                {!customOk && <span className="text-amber-700">Use numbers from 1 to 100.</span>}
              </div>
            )}
          </fieldset>

          <ImageCropper
            source={photo.source}
            aspect={ratio}
            crop={photo.crop}
            onChange={(c) => {
              setResult(null);
              setPhoto((p) => (p ? { ...p, crop: c } : p));
            }}
            label="Crop box"
          />
          <p className="text-center text-sm font-medium tabular-nums text-slate-700">
            {Math.round(photo.crop.w)} × {Math.round(photo.crop.h)} px
          </p>
          {photo.reduced && (
            <p className="text-xs text-slate-500">
              This image is very large, so it was reduced to {photo.base.width} × {photo.base.height} px to work in your browser.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={btn} onClick={() => turn(-1)}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Left
            </button>
            <button type="button" className={btn} onClick={() => turn(1)}>
              <RotateCw className="h-4 w-4" aria-hidden="true" /> Right
            </button>
            <label className="flex min-w-56 flex-1 items-center gap-3 text-sm text-slate-700">
              Straighten
              <input
                type="range"
                min={-10}
                max={10}
                step={0.5}
                value={photo.fine}
                onChange={(e) => straighten(Number(e.target.value))}
                className="flex-1 accent-blue-600"
              />
              <span className="w-12 text-right tabular-nums">{photo.fine}°</span>
            </label>
          </div>

          <Segmented legend="Save as" name="crop-format" options={FORMATS} value={format} onChange={setFormat} />

          <div className={STICKY_ACTIONS}>
            <button
              type="button"
              onClick={() => void crop()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
              Crop &amp; download
            </button>
          </div>

          {result && (
            <div className="space-y-3">
              <p role="status" className="text-sm text-slate-700">
                Saved {result.name}: {result.width} × {result.height} px, {formatBytes(result.blob.size)}.{" "}
                <button type="button" onClick={() => downloadBlob(result.blob, result.name)} className="font-medium text-blue-700 underline">
                  Download again
                </button>
              </p>
              <NextSteps files={[blobToFile(result.blob, result.name)]} kind="image" current="/crop-image" />
            </div>
          )}
        </section>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {error}
        </p>
      )}
    </div>
  );
}
