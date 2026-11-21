"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileText, ImageIcon, Loader2, RotateCcw, RotateCw } from "lucide-react";
import Dropzone from "@/components/Dropzone";
import ImageCropper from "@/components/ImageCropper";
import Segmented, { type Option } from "@/components/Segmented";
import { useHandoff } from "@/hooks/useHandoff";
import { downloadBlob } from "@/lib/download";
import { formatBytes } from "@/lib/files";
import type { CropRect } from "@/lib/image";
import { clampCrop, defaultCrop, loadImageSource, rotateSource } from "@/lib/idCard";
import {
  PAPERS,
  PRESETS,
  aspectOf,
  buildSheetJpg,
  buildSheetPdf,
  canvasToJpeg,
  encodePhoto,
  outputPixels,
  renderPhoto,
  sheetLayout,
  type Adjust,
  type Paper,
  type PhotoSize,
} from "@/lib/passportPhoto";
import { STICKY_ACTIONS } from "@/lib/ui";

type Photo = { base: HTMLCanvasElement; quarter: number; fine: number; source: HTMLCanvasElement; crop: CropRect };

const PAPER_OPTIONS: Option<Paper>[] = [
  { value: "4x6", label: "4 × 6 in" },
  { value: "a4", label: "A4" },
];

/** Keep the crop's centre and height (heads stay the same size), change its shape. */
function reshape(crop: CropRect, src: HTMLCanvasElement, aspect: number): CropRect {
  let h = crop.h;
  let w = h * aspect;
  if (w > src.width) {
    w = src.width * 0.9;
    h = w / aspect;
  }
  if (h > src.height) {
    h = src.height * 0.9;
    w = h * aspect;
  }
  return clampCrop({ x: crop.x + crop.w / 2 - w / 2, y: crop.y + crop.h / 2 - h / 2, w, h }, src);
}

function num(v: string, min: number, max: number) {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

export default function PassportPhotoTool() {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [presetId, setPresetId] = useState("passport");
  const [pxW, setPxW] = useState("200");
  const [pxH, setPxH] = useState("230");
  const [maxKB, setMaxKB] = useState("");
  const [adjust, setAdjust] = useState<Adjust>({ brightness: 0, contrast: 0 });
  const [paper, setPaper] = useState<Paper>("4x6");
  const [copies, setCopies] = useState(8);
  const [cutLines, setCutLines] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [sheetPreview, setSheetPreview] = useState("");
  const photoView = useRef<HTMLCanvasElement>(null);

  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];
  const customW = num(pxW, 50, 3000);
  const customH = num(pxH, 50, 3000);
  const kbLimit = maxKB.trim() === "" ? undefined : num(maxKB, 5, 5000) ?? undefined;
  const kbInvalid = maxKB.trim() !== "" && kbLimit === undefined;

  const size: PhotoSize | null = preset.size ?? (customW && customH ? { unit: "px", w: customW, h: customH } : null);
  const aspect = size ? aspectOf(size) : 35 / 45;
  const out = size ? outputPixels(size) : null;
  const printable = size?.unit === "mm" ? { w: size.w, h: size.h } : null;
  const sheet = useMemo(() => (printable ? sheetLayout(printable, paper, copies) : null), [printable?.w, printable?.h, paper, copies]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the crop box in the chosen photo shape
  useEffect(() => {
    setPhoto((p) => (p ? { ...p, crop: reshape(p.crop, p.source, aspect) } : p));
  }, [aspect]);

  // Copies can't exceed what fits on the paper
  useEffect(() => {
    if (sheet && copies > sheet.max) setCopies(sheet.max);
  }, [sheet, copies]);

  // Draw the finished photo and (for printed sizes) a small sheet preview
  useEffect(() => {
    setResult("");
    if (!photo || !out) {
      setSheetPreview("");
      return;
    }
    const t = setTimeout(async () => {
      try {
        const canvas = renderPhoto(photo.source, photo.crop, out.w, out.h, adjust);
        const view = photoView.current;
        if (view) {
          view.width = canvas.width;
          view.height = canvas.height;
          view.getContext("2d")?.drawImage(canvas, 0, 0);
        }
        if (printable) {
          const s = await buildSheetJpg(canvas, printable, paper, copies, cutLines, 40);
          setSheetPreview(s.toDataURL("image/jpeg", 0.8));
          s.width = s.height = 0;
        } else {
          setSheetPreview("");
        }
        canvas.width = canvas.height = 0;
      } catch {
        setSheetPreview("");
      }
    }, 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo, out?.w, out?.h, adjust, paper, copies, cutLines, printable?.w, printable?.h]);

  async function handleFiles(files: File[]) {
    const file = files[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const base = await loadImageSource(file);
      setPhoto({ base, quarter: 0, fine: 0, source: base, crop: defaultCrop(base, aspect) });
      setAdjust({ brightness: 0, contrast: 0 });
    } catch {
      setError("This image could not be opened. Try a JPG or PNG photo.");
    } finally {
      setBusy(false);
    }
  }

  useHandoff((files) => void handleFiles(files));

  function turn(by: number) {
    setPhoto((p) => {
      if (!p) return p;
      const quarter = (p.quarter + by + 4) % 4;
      const source = rotateSource(p.base, quarter, p.fine);
      return { ...p, quarter, source, crop: defaultCrop(source, aspect) };
    });
  }

  function straighten(fine: number) {
    setPhoto((p) => {
      if (!p) return p;
      const source = rotateSource(p.base, p.quarter, fine);
      return { ...p, fine, source, crop: clampCrop(p.crop, source) };
    });
  }

  async function downloadPhoto() {
    if (!photo || !out) return;
    setBusy(true);
    setError("");
    try {
      const canvas = renderPhoto(photo.source, photo.crop, out.w, out.h, adjust);
      const { blob, reached } = await encodePhoto(canvas, kbLimit);
      canvas.width = canvas.height = 0;
      downloadBlob(blob, `photo-${out.w}x${out.h}.jpg`);
      setResult(
        reached
          ? `Saved: ${out.w} × ${out.h} px, ${formatBytes(blob.size)}.`
          : `Saved at ${formatBytes(blob.size)}, still above ${kbLimit} KB. Try a smaller pixel size or a plainer background.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function downloadSheet(type: "pdf" | "jpg") {
    if (!photo || !out || !printable) return;
    setBusy(true);
    setError("");
    try {
      const canvas = renderPhoto(photo.source, photo.crop, out.w, out.h, adjust);
      if (type === "pdf") {
        const jpg = await canvasToJpeg(canvas, 0.95);
        downloadBlob(await buildSheetPdf(jpg, printable, paper, copies, cutLines), `photo-sheet-${paper}.pdf`);
      } else {
        const s = await buildSheetJpg(canvas, printable, paper, copies, cutLines);
        downloadBlob(await canvasToJpeg(s, 0.92), `photo-sheet-${paper}.jpg`);
        s.width = s.height = 0;
      }
      canvas.width = canvas.height = 0;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const btn =
    "inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";
  const input = "mt-1 block w-28 rounded-lg border border-slate-300 px-3 py-2 text-base";

  return (
    <div className="space-y-6">
      {!photo ? (
        <Dropzone
          accept={["jpeg", "png", "webp"]}
          multiple={false}
          maxSizeMB={50}
          onFiles={(f) => void handleFiles(f)}
          title="Add your photo"
          hint="JPG, PNG or WebP · face the camera against a plain light wall · stays on your device"
        />
      ) : (
        <>
          <section aria-labelledby="size-heading" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 id="size-heading" className="text-lg font-semibold text-slate-900">
                1. Choose the size
              </h2>
              <button type="button" className={btn} onClick={() => setPhoto(null)} disabled={busy}>
                Use another photo
              </button>
            </div>
            <fieldset>
              <legend className="sr-only">Photo size</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PRESETS.map((p) => (
                  <label
                    key={p.id}
                    className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${presetId === p.id ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600" : "border-slate-300 bg-white"}`}
                  >
                    <input type="radio" name="photo-size" value={p.id} checked={presetId === p.id} onChange={() => setPresetId(p.id)} className="sr-only" />
                    <span className="block font-semibold text-slate-900">{p.label}</span>
                    <span className="block text-slate-500">{p.note}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-wrap items-end gap-4">
              {!preset.size && (
                <>
                  <label className="text-sm font-medium text-slate-700">
                    Width (px)
                    <input inputMode="numeric" value={pxW} onChange={(e) => setPxW(e.target.value)} className={input} />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Height (px)
                    <input inputMode="numeric" value={pxH} onChange={(e) => setPxH(e.target.value)} className={input} />
                  </label>
                </>
              )}
              <label className="text-sm font-medium text-slate-700">
                Max size (KB, optional)
                <input inputMode="numeric" value={maxKB} onChange={(e) => setMaxKB(e.target.value)} placeholder="e.g. 50" className={input} />
              </label>
            </div>
            {!size && <p className="text-sm text-amber-700">Enter a width and height between 50 and 3000 pixels.</p>}
            {kbInvalid && <p className="text-sm text-amber-700">Enter a size between 5 and 5000 KB, or leave it empty.</p>}
            {!preset.size && (
              <p className="text-xs text-slate-500">Copy the exact pixel size and KB limit from your exam or job notification.</p>
            )}
          </section>

          <section aria-labelledby="crop-heading" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 id="crop-heading" className="text-lg font-semibold text-slate-900">
              2. Position your face
            </h2>
            <p className="text-sm text-slate-500">
              Move and resize the box so your head fills the dotted oval, with a little space above the hair and your shoulders at the
              bottom.
            </p>
            <ImageCropper
              source={photo.source}
              aspect={aspect}
              crop={photo.crop}
              onChange={(crop) => setPhoto((p) => (p ? { ...p, crop } : p))}
              label="Photo crop box"
              guide="face"
            />
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
            <div className="grid gap-3 sm:grid-cols-2">
              {(["brightness", "contrast"] as const).map((k) => (
                <label key={k} className="flex items-center gap-3 text-sm capitalize text-slate-700">
                  <span className="w-20">{k}</span>
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    value={adjust[k]}
                    onChange={(e) => setAdjust((a) => ({ ...a, [k]: Number(e.target.value) }))}
                    className="flex-1 accent-blue-600"
                  />
                  <span className="w-10 text-right tabular-nums">{adjust[k]}</span>
                </label>
              ))}
            </div>
          </section>

          <section aria-labelledby="out-heading" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 id="out-heading" className="text-lg font-semibold text-slate-900">
              3. Download
            </h2>
            <div className="flex flex-wrap items-start gap-6">
              <figure className="space-y-2">
                <canvas ref={photoView} className="block h-auto w-36 rounded border border-slate-300 shadow-sm" aria-label="Finished photo preview" />
                {out && (
                  <figcaption className="text-xs text-slate-500">
                    {out.w} × {out.h} px{printable ? ` · ${printable.w / 10} × ${printable.h / 10} cm` : ""}
                  </figcaption>
                )}
              </figure>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => void downloadPhoto()}
                  disabled={busy || !out || kbInvalid}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                  Download photo (JPG)
                </button>
                <p role="status" aria-live="polite" className="text-sm text-slate-700">
                  {result}
                </p>
              </div>
            </div>

            {printable && sheet && (
              <div className="space-y-4 border-t border-slate-200 pt-5">
                <h3 className="font-semibold text-slate-900">Print sheet</h3>
                <div className="flex flex-wrap items-end gap-5">
                  <Segmented legend="Paper" name="photo-paper" options={PAPER_OPTIONS} value={paper} onChange={setPaper} />
                  <label className="text-sm font-medium text-slate-700">
                    Copies
                    <select
                      value={copies}
                      onChange={(e) => setCopies(Number(e.target.value))}
                      className="mt-1 block rounded-lg border border-slate-300 px-3 py-2"
                    >
                      {Array.from({ length: sheet.max }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
                    <input type="checkbox" checked={cutLines} onChange={(e) => setCutLines(e.target.checked)} className="h-4 w-4 accent-blue-600" />
                    Cut lines
                  </label>
                </div>
                {sheetPreview && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={sheetPreview} alt={`Preview of ${copies} photos on ${PAPERS[paper].label}`} className="w-full max-w-[16rem] rounded border border-slate-300 shadow-sm" />
                )}
                <p className="text-xs text-slate-500">Print at 100% / &quot;Actual size&quot;, not &quot;Fit to page&quot;, so each photo comes out at the right size.</p>
                <div className={STICKY_ACTIONS}>
                  <button
                    type="button"
                    onClick={() => void downloadSheet("pdf")}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <FileText className="h-4 w-4" aria-hidden="true" /> Sheet PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => void downloadSheet("jpg")}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ImageIcon className="h-4 w-4" aria-hidden="true" /> Sheet JPG
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {error}
        </p>
      )}
    </div>
  );
}
