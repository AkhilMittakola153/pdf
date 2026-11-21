"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ImageIcon, Loader2, RotateCcw, RotateCw } from "lucide-react";
import Dropzone from "@/components/Dropzone";
import ImageCropper from "@/components/ImageCropper";
import Segmented, { type Option } from "@/components/Segmented";
import { useHandoff } from "@/hooks/useHandoff";
import { downloadBlob } from "@/lib/download";
import { formatBytes } from "@/lib/files";
import type { CropRect } from "@/lib/image";
import { clampCrop, defaultCrop, loadImageSource, rotateSource } from "@/lib/idCard";
import { encodePhoto } from "@/lib/passportPhoto";
import { cleanSignature, signatureOnWhite, type InkColour } from "@/lib/signature";

type Photo = { base: HTMLCanvasElement; quarter: number; fine: number; source: HTMLCanvasElement; crop: CropRect };

const INKS: Option<InkColour>[] = [
  { value: "black", label: "Black ink" },
  { value: "blue", label: "Blue ink" },
];

function num(v: string, min: number, max: number) {
  const n = Number(v);
  return v.trim() !== "" && Number.isFinite(n) && n >= min && n <= max ? n : null;
}

function toPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("could not save the image."))), "image/png"),
  );
}

export default function SignatureTool() {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [sensitivity, setSensitivity] = useState(60);
  const [ink, setInk] = useState<InkColour>("black");
  const [removeSpecks, setRemoveSpecks] = useState(true);
  const [pxW, setPxW] = useState("");
  const [pxH, setPxH] = useState("");
  const [maxKB, setMaxKB] = useState("20");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [cleaned, setCleaned] = useState<HTMLCanvasElement | null>(null);
  const preview = useRef<HTMLCanvasElement>(null);

  const w = num(pxW, 20, 3000);
  const h = num(pxH, 20, 3000);
  const kb = num(maxKB, 2, 5000);
  const sizeInvalid = (pxW.trim() !== "" && !w) || (pxH.trim() !== "" && !h) || (!!w !== !!h);
  const kbInvalid = maxKB.trim() !== "" && !kb;

  // Re-clean shortly after any change
  useEffect(() => {
    setResult("");
    if (!photo) {
      setCleaned(null);
      return;
    }
    const t = setTimeout(() => {
      try {
        setCleaned(cleanSignature(photo.source, photo.crop, { sensitivity, ink, removeSpecks }));
        setError("");
      } catch (e) {
        setCleaned(null);
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    }, 150);
    return () => clearTimeout(t);
  }, [photo, sensitivity, ink, removeSpecks]);

  // Show the result
  useEffect(() => {
    const view = preview.current;
    if (!view || !cleaned) return;
    view.width = cleaned.width;
    view.height = cleaned.height;
    const ctx = view.getContext("2d");
    ctx?.clearRect(0, 0, view.width, view.height);
    ctx?.drawImage(cleaned, 0, 0);
  }, [cleaned]);

  async function handleFiles(files: File[]) {
    const file = files[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const base = await loadImageSource(file);
      setPhoto({ base, quarter: 0, fine: 0, source: base, crop: defaultCrop(base, base.width / base.height) });
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
      return { ...p, quarter, source, crop: defaultCrop(source, source.width / source.height) };
    });
  }

  function straighten(fine: number) {
    setPhoto((p) => {
      if (!p) return p;
      const source = rotateSource(p.base, p.quarter, fine);
      return { ...p, fine, source, crop: clampCrop(p.crop, source) };
    });
  }

  async function downloadPng() {
    if (!cleaned) return;
    downloadBlob(await toPng(cleaned), "signature-transparent.png");
  }

  async function downloadJpg() {
    if (!cleaned) return;
    setBusy(true);
    try {
      const canvas = signatureOnWhite(cleaned, w ?? undefined, h ?? undefined);
      const { blob, reached } = await encodePhoto(canvas, kb ?? undefined);
      downloadBlob(blob, `signature-${canvas.width}x${canvas.height}.jpg`);
      setResult(
        reached
          ? `Saved: ${canvas.width} × ${canvas.height} px, ${formatBytes(blob.size)}.`
          : `Saved at ${formatBytes(blob.size)}, still above ${kb} KB. Enter a smaller width and height.`,
      );
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
          title="Add a photo of your signature"
          hint="Sign on plain white paper with a dark pen, then take a photo · stays on your device"
        />
      ) : (
        <>
          <section aria-labelledby="sig-crop" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 id="sig-crop" className="text-lg font-semibold text-slate-900">
                1. Select the signature
              </h2>
              <button type="button" className={btn} onClick={() => setPhoto(null)} disabled={busy}>
                Use another photo
              </button>
            </div>
            <p className="text-sm text-slate-500">Drag the box around your signature. Leave out paper edges, lines and other writing.</p>
            <ImageCropper
              source={photo.source}
              aspect={null}
              crop={photo.crop}
              onChange={(crop) => setPhoto((p) => (p ? { ...p, crop } : p))}
              label="Signature selection box"
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
          </section>

          <section aria-labelledby="sig-clean" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 id="sig-clean" className="text-lg font-semibold text-slate-900">
              2. Clean it up
            </h2>
            <div
              className="rounded-lg border border-slate-300 p-3"
              style={{ backgroundImage: "repeating-conic-gradient(#f1f5f9 0% 25%, #ffffff 0% 50%)", backgroundSize: "20px 20px" }}
            >
              {cleaned ? (
                <canvas ref={preview} className="mx-auto block h-auto max-h-48 w-auto max-w-full" aria-label="Cleaned signature preview" />
              ) : (
                <p className="py-8 text-center text-sm text-slate-500">Preview appears here.</p>
              )}
            </div>
            <p className="text-xs text-slate-500">The checked pattern shows the transparent background.</p>
            <label className="flex items-center gap-3 text-sm text-slate-700">
              <span className="w-28">Ink detection</span>
              <input
                type="range"
                min={0}
                max={100}
                value={sensitivity}
                onChange={(e) => setSensitivity(Number(e.target.value))}
                className="flex-1 accent-blue-600"
              />
              <span className="w-10 text-right tabular-nums">{sensitivity}</span>
            </label>
            <p className="text-xs text-slate-500">Raise it if thin strokes are missing; lower it if paper texture or dots appear.</p>
            <div className="flex flex-wrap items-center gap-5">
              <Segmented legend="Ink colour" name="sig-ink" options={INKS} value={ink} onChange={setInk} />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={removeSpecks} onChange={(e) => setRemoveSpecks(e.target.checked)} className="h-4 w-4 accent-blue-600" />
                Remove small dots
              </label>
            </div>
          </section>

          <section aria-labelledby="sig-out" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 id="sig-out" className="text-lg font-semibold text-slate-900">
              3. Download
            </h2>
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900">For documents and Sign PDF</h3>
              <button type="button" onClick={() => void downloadPng()} disabled={!cleaned} className={btn}>
                <ImageIcon className="h-4 w-4" aria-hidden="true" /> Transparent PNG{cleaned ? ` (${cleaned.width} × ${cleaned.height} px)` : ""}
              </button>
            </div>
            <div className="space-y-3 border-t border-slate-200 pt-5">
              <h3 className="font-semibold text-slate-900">For online forms (JPG on white)</h3>
              <div className="flex flex-wrap items-end gap-4">
                <label className="text-sm font-medium text-slate-700">
                  Width (px)
                  <input inputMode="numeric" value={pxW} onChange={(e) => setPxW(e.target.value)} placeholder="e.g. 140" className={input} />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Height (px)
                  <input inputMode="numeric" value={pxH} onChange={(e) => setPxH(e.target.value)} placeholder="e.g. 60" className={input} />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Max size (KB)
                  <input inputMode="numeric" value={maxKB} onChange={(e) => setMaxKB(e.target.value)} className={input} />
                </label>
              </div>
              {sizeInvalid && <p className="text-sm text-amber-700">Enter both width and height (20–3000 px), or leave both empty.</p>}
              {kbInvalid && <p className="text-sm text-amber-700">Enter a size between 2 and 5000 KB, or leave it empty.</p>}
              <p className="text-xs text-slate-500">Copy the size from your form&apos;s instructions. Leave width and height empty to keep the trimmed size.</p>
              <button
                type="button"
                onClick={() => void downloadJpg()}
                disabled={busy || !cleaned || sizeInvalid || kbInvalid}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                Download JPG
              </button>
              <p role="status" aria-live="polite" className="text-sm text-slate-700">
                {result}
              </p>
            </div>
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
