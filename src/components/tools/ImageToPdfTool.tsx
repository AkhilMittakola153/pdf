"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, Loader2, RotateCcw } from "lucide-react";
import Dropzone from "@/components/Dropzone";
import FileList from "@/components/FileList";
import { useFileItems } from "@/hooks/useFileItems";
import { baseName, displayName, formatBytes, safeDownloadName } from "@/lib/files";
import { getImageSize, type Size } from "@/lib/image";
import { downloadBlob } from "@/lib/download";
import {
  buildPdfFromImages,
  computeLayout,
  type LayoutSettings,
  type MarginChoice,
  type OrientationChoice,
  type PageSizeChoice,
} from "@/lib/imageToPdf";

const MAX_FILES = 50;

type Option<T extends string> = { value: T; label: string };

const PAGE_SIZE_OPTIONS: Option<PageSizeChoice>[] = [
  { value: "a4", label: "A4" },
  { value: "letter", label: "Letter" },
  { value: "fit", label: "Fit to image" },
];
const ORIENTATION_OPTIONS: Option<OrientationChoice>[] = [
  { value: "auto", label: "Auto" },
  { value: "portrait", label: "Portrait" },
  { value: "landscape", label: "Landscape" },
];
const MARGIN_OPTIONS: Option<MarginChoice>[] = [
  { value: "none", label: "None" },
  { value: "small", label: "Small" },
  { value: "large", label: "Large" },
];

type Result = { blob: Blob; url: string; name: string; pageCount: number };

/** Row of toggle buttons that behaves like radio buttons (keyboard friendly). */
function Segmented<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  disabled = false,
}: {
  legend: string;
  name: string;
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="disabled:opacity-50">
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

export default function ImageToPdfTool() {
  const { items, add, remove, move, update, clear } = useFileItems({ preview: true });
  const [dims, setDims] = useState<Record<string, Size>>({});

  const [settings, setSettings] = useState<LayoutSettings>({
    pageSize: "a4",
    orientation: "auto",
    margin: "small",
  });
  const [fileName, setFileName] = useState("");

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

  function changeSettings(patch: Partial<LayoutSettings>) {
    clearResult();
    setSettings((s) => ({ ...s, ...patch }));
  }

  function handleFiles(files: File[]) {
    clearResult();
    if (items.length === 0 && !fileName && files[0]) setFileName(baseName(files[0].name));
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

  function startOver() {
    clearResult();
    clear();
    setDims({});
    setFileName("");
  }

  async function createPdf() {
    clearResult();
    cancelRef.current = false;
    setProcessing(true);
    const name = safeDownloadName(fileName.trim() || "images", "pdf");

    try {
      const out = await buildPdfFromImages(
        items.map((i) => i.file),
        settings,
        name.replace(/\.pdf$/, ""),
        (done, total) => setStatus(done < total ? `Adding image ${done + 1} of ${total}…` : "Saving PDF…"),
        () => cancelRef.current,
      );
      if (!out) {
        setStatus("Cancelled. No PDF was created.");
        return;
      }
      const url = URL.createObjectURL(out.blob);
      resultUrl.current = url;
      setResult({ blob: out.blob, url, name, pageCount: out.pageCount });
      setErrors(out.skipped.map((n) => `"${displayName(n)}" could not be read and was left out.`));
      setStatus(`PDF ready: ${out.pageCount} page${out.pageCount === 1 ? "" : "s"}.`);
    } catch (e) {
      setStatus("");
      setErrors([e instanceof Error ? e.message : "Something went wrong while creating the PDF."]);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <Dropzone
        accept={["jpeg", "png", "webp"]}
        currentCount={items.length}
        maxFiles={MAX_FILES}
        maxSizeMB={25}
        onFiles={handleFiles}
        title="Drop images here"
      />

      <FileList
        items={items}
        onMove={(id, dir) => {
          clearResult();
          move(id, dir);
        }}
        onRemove={(id) => {
          clearResult();
          remove(id);
        }}
      />

      {items.length > 0 && (
        <section aria-labelledby="pdf-settings" className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 id="pdf-settings" className="text-lg font-semibold text-slate-900">
            PDF settings
          </h2>

          <div className="flex flex-wrap gap-6">
            <Segmented
              legend="Page size"
              name="page-size"
              options={PAGE_SIZE_OPTIONS}
              value={settings.pageSize}
              onChange={(v) => changeSettings({ pageSize: v })}
            />
            <Segmented
              legend="Orientation"
              name="orientation"
              options={ORIENTATION_OPTIONS}
              value={settings.orientation}
              onChange={(v) => changeSettings({ orientation: v })}
              disabled={settings.pageSize === "fit"}
            />
            <Segmented
              legend="Margin"
              name="margin"
              options={MARGIN_OPTIONS}
              value={settings.margin}
              onChange={(v) => changeSettings({ margin: v })}
            />
          </div>

          <div className="max-w-sm">
            <label htmlFor="pdf-name" className="block text-sm font-medium text-slate-700">
              File name
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="pdf-name"
                type="text"
                value={fileName}
                maxLength={80}
                onChange={(e) => {
                  clearResult();
                  setFileName(e.target.value);
                }}
                placeholder="images"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <span className="text-sm text-slate-500">.pdf</span>
            </div>
          </div>

          {/* Live page preview, calculated with the same maths as the real PDF */}
          <div>
            <h3 className="text-sm font-medium text-slate-700">Preview</h3>
            <ol className="mt-3 grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {items.map((item, index) => {
                const size = dims[item.id];
                if (!size || !item.previewUrl) {
                  return (
                    <li key={item.id} className="flex aspect-[3/4] items-center justify-center rounded border bg-slate-50 text-xs text-slate-400">
                      Loading…
                    </li>
                  );
                }
                const l = computeLayout(size, settings);
                return (
                  <li key={item.id} className="text-center">
                    <div
                      className="relative w-full overflow-hidden rounded border border-slate-300 bg-white shadow-sm"
                      style={{ aspectRatio: `${l.pageWidth} / ${l.pageHeight}` }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.previewUrl}
                        alt=""
                        className="absolute"
                        style={{
                          left: `${(l.x / l.pageWidth) * 100}%`,
                          top: `${((l.pageHeight - l.y - l.height) / l.pageHeight) * 100}%`,
                          width: `${(l.width / l.pageWidth) * 100}%`,
                          height: `${(l.height / l.pageHeight) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="mt-1 block text-xs text-slate-500">Page {index + 1}</span>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="flex flex-wrap gap-3">
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
                onClick={createPdf}
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Create PDF
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
          aria-label="Your PDF"
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
