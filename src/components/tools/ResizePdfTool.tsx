"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, FileText, Loader2, RotateCcw } from "lucide-react";
import Dropzone from "@/components/Dropzone";
import { baseName, displayName, formatBytes, safeDownloadName } from "@/lib/files";
import { downloadBlob } from "@/lib/download";
import { openPdf, renderThumbnail } from "@/lib/pdfRender";
import {
  PAGE_SIZES,
  computeFit,
  describeSize,
  readPdfInfo,
  resizePdf,
  type Margin,
  type Orientation,
  type ResizeSettings,
  type SizeChoice,
  type Unit,
} from "@/lib/resizePdf";

type Option<T extends string> = { value: T; label: string };

const SIZE_OPTIONS: Option<SizeChoice>[] = [
  { value: "a4", label: "A4" },
  { value: "letter", label: "Letter" },
  { value: "a3", label: "A3" },
  { value: "a5", label: "A5" },
  { value: "legal", label: "Legal" },
  { value: "custom", label: "Custom" },
];
const ORIENTATION_OPTIONS: Option<Orientation>[] = [
  { value: "auto", label: "Auto" },
  { value: "portrait", label: "Portrait" },
  { value: "landscape", label: "Landscape" },
];
const MARGIN_OPTIONS: Option<Margin>[] = [
  { value: "none", label: "None" },
  { value: "small", label: "Small" },
  { value: "large", label: "Large" },
];

type Result = { blob: Blob; url: string; name: string; pageCount: number };

function Segmented<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700">{legend}</legend>
      <div className="mt-2 inline-flex flex-wrap rounded-lg border border-slate-300 p-1">
        {options.map((o) => (
          <label
            key={o.value}
            className={`cursor-pointer rounded-md px-3 py-2 text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue-600 ${
              value === o.value ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function ResizePdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<{ pageCount: number; firstPage: { width: number; height: number } } | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);

  const [settings, setSettings] = useState<ResizeSettings>({
    size: "a4",
    orientation: "auto",
    margin: "none",
    customWidth: 210,
    customHeight: 297,
    unit: "mm",
  });

  const [result, setResult] = useState<Result | null>(null);
  const [opening, setOpening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const cancelRef = useRef(false);
  const generation = useRef(0);
  const urls = useRef<Set<string>>(new Set());

  useEffect(() => {
    const set = urls.current;
    return () => set.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  function trackUrl(blob: Blob) {
    const u = URL.createObjectURL(blob);
    urls.current.add(u);
    return u;
  }

  function freeUrl(u: string | null | undefined) {
    if (!u) return;
    URL.revokeObjectURL(u);
    urls.current.delete(u);
  }

  function clearResult() {
    freeUrl(result?.url);
    setResult(null);
    setStatus("");
    setErrors([]);
  }

  function change(patch: Partial<ResizeSettings>) {
    clearResult();
    setSettings((s) => ({ ...s, ...patch }));
  }

  function reset() {
    generation.current++;
    clearResult();
    freeUrl(thumb);
    setThumb(null);
    setFile(null);
    setInfo(null);
  }

  async function handleFiles(files: File[]) {
    const f = files[0];
    if (!f) return;
    reset();
    const gen = generation.current;
    setOpening(true);
    try {
      const i = await readPdfInfo(f);
      if (gen !== generation.current) return;
      setFile(f);
      setInfo(i);
    } catch (e) {
      if (gen === generation.current) setErrors([e instanceof Error ? e.message : "This PDF could not be opened."]);
      return;
    } finally {
      if (gen === generation.current) setOpening(false);
    }

    // Preview image of page 1 (optional; the tool still works without it)
    try {
      const { doc, close } = await openPdf(f);
      try {
        const blob = await renderThumbnail(doc, 1, 360);
        if (gen === generation.current) setThumb(trackUrl(blob));
      } finally {
        await close();
      }
    } catch {
      // no preview, that's fine
    }
  }

  const fit = info ? computeFit(info.firstPage, settings) : null;
  const sizeLabel = settings.size === "custom" ? "custom" : PAGE_SIZES[settings.size].label;

  async function run() {
    if (!file) return;
    clearResult();
    cancelRef.current = false;
    setProcessing(true);
    const name = safeDownloadName(`${baseName(file.name)}-${sizeLabel}`, "pdf");
    try {
      const out = await resizePdf(
        file,
        settings,
        name.replace(/\.pdf$/, ""),
        (done, total) => setStatus(done < total ? `Resizing page ${done + 1} of ${total}…` : "Saving PDF…"),
        () => cancelRef.current,
      );
      if (!out) {
        setStatus("Cancelled. No PDF was created.");
        return;
      }
      setResult({ blob: out.blob, url: trackUrl(out.blob), name, pageCount: out.pageCount });
      setStatus(`Done: ${out.pageCount} page${out.pageCount === 1 ? "" : "s"} resized.`);
    } catch (e) {
      setStatus("");
      setErrors([e instanceof Error ? e.message : "Something went wrong while resizing."]);
    } finally {
      setProcessing(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";

  return (
    <div className="space-y-6">
      {!file && (
        <Dropzone accept={["pdf"]} multiple={false} maxSizeMB={100} onFiles={handleFiles} title="Drop a PDF here" />
      )}

      {opening && (
        <p className="flex items-center gap-2 text-sm text-slate-700" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Opening PDF…
        </p>
      )}

      {file && info && (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-100">
              <FileText className="h-6 w-6 text-slate-500" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-900">{displayName(file.name)}</p>
              <p className="text-sm text-slate-500">
                {info.pageCount} page{info.pageCount === 1 ? "" : "s"} · {formatBytes(file.size)} · Page 1:{" "}
                {describeSize(info.firstPage)}
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              disabled={processing}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Choose another PDF
            </button>
          </div>

          <section aria-labelledby="resize-settings" className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 id="resize-settings" className="text-lg font-semibold text-slate-900">
              New page size
            </h2>

            <div className="grid gap-6 md:grid-cols-[1fr_auto]">
              <div className="space-y-5">
                <Segmented legend="Page size" name="size" options={SIZE_OPTIONS} value={settings.size} onChange={(v) => change({ size: v })} />

                {settings.size === "custom" && (
                  <div className="grid max-w-md grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="cw" className="block text-sm font-medium text-slate-700">
                        Width
                      </label>
                      <input
                        id="cw"
                        type="number"
                        inputMode="decimal"
                        min={1}
                        value={settings.customWidth || ""}
                        onChange={(e) => change({ customWidth: Number(e.target.value) })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="ch" className="block text-sm font-medium text-slate-700">
                        Height
                      </label>
                      <input
                        id="ch"
                        type="number"
                        inputMode="decimal"
                        min={1}
                        value={settings.customHeight || ""}
                        onChange={(e) => change({ customHeight: Number(e.target.value) })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="unit" className="block text-sm font-medium text-slate-700">
                        Unit
                      </label>
                      <select
                        id="unit"
                        value={settings.unit}
                        onChange={(e) => change({ unit: e.target.value as Unit })}
                        className={inputClass}
                      >
                        <option value="mm">mm</option>
                        <option value="in">inches</option>
                      </select>
                    </div>
                  </div>
                )}

                <Segmented
                  legend="Orientation"
                  name="orientation"
                  options={ORIENTATION_OPTIONS}
                  value={settings.orientation}
                  onChange={(v) => change({ orientation: v })}
                />
                <Segmented legend="Margin" name="margin" options={MARGIN_OPTIONS} value={settings.margin} onChange={(v) => change({ margin: v })} />

                {fit ? (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    Page 1: {describeSize(info.firstPage)} →{" "}
                    <span className="font-semibold">{describeSize({ width: fit.pageWidth, height: fit.pageHeight })}</span>
                  </p>
                ) : (
                  <p className="text-sm text-red-600">Enter a custom size between 13 mm and 5 m (0.5 to 200 inches).</p>
                )}
              </div>

              {/* Live preview of page 1 on the new page size */}
              {fit && (
                <figure className="mx-auto w-44">
                  <div
                    className="relative w-full overflow-hidden rounded border border-slate-300 bg-white shadow-sm"
                    style={{ aspectRatio: `${fit.pageWidth} / ${fit.pageHeight}` }}
                  >
                    <div
                      className="absolute flex items-center justify-center bg-slate-100 outline outline-1 outline-blue-300"
                      style={{
                        left: `${(fit.x / fit.pageWidth) * 100}%`,
                        top: `${((fit.pageHeight - fit.y - fit.height) / fit.pageHeight) * 100}%`,
                        width: `${(fit.width / fit.pageWidth) * 100}%`,
                        height: `${(fit.height / fit.pageHeight) * 100}%`,
                      }}
                    >
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" className="h-full w-full object-fill" />
                      ) : (
                        <FileText className="h-6 w-6 text-slate-400" aria-hidden="true" />
                      )}
                    </div>
                  </div>
                  <figcaption className="mt-2 text-center text-xs text-slate-500">Preview of page 1</figcaption>
                </figure>
              )}
            </div>

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
                disabled={!fit}
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Resize PDF
              </button>
            )}
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

      {errors.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      {result && (
        <section
          aria-label="Your resized PDF"
          className="flex flex-wrap items-center gap-4 rounded-2xl border border-green-200 bg-green-50 p-5"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900">{result.name}</p>
            <p className="text-sm text-slate-600">
              {result.pageCount} page{result.pageCount === 1 ? "" : "s"} · {formatBytes(result.blob.size)}
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
        </section>
      )}
    </div>
  );
}
