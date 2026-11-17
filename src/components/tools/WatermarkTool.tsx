"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import Dropzone from "@/components/Dropzone";
import NextSteps from "@/components/NextSteps";
import PdfFileCard from "@/components/PdfFileCard";
import Segmented, { type Option } from "@/components/Segmented";
import { useHandoff } from "@/hooks/useHandoff";
import { usePdfPages } from "@/hooks/usePdfPages";
import { downloadBlob } from "@/lib/download";
import { baseName, formatBytes, safeDownloadName } from "@/lib/files";
import { blobToFile } from "@/lib/handoff";
import { parsePageRange } from "@/lib/pdfRender";
import { STICKY_ACTIONS } from "@/lib/ui";
import { addWatermark, SIZE_FRACTION, TILE_FACTOR, type WmAngle, type WmLayout, type WmSize } from "@/lib/watermark";

const PRESETS = ["CONFIDENTIAL", "DRAFT", "COPY", "SAMPLE", "DO NOT COPY"];
const COLORS = [
  { value: "#6b7280", label: "Grey" },
  { value: "#dc2626", label: "Red" },
  { value: "#1d4ed8", label: "Blue" },
];
const LAYOUTS: Option<WmLayout>[] = [
  { value: "center", label: "Centre" },
  { value: "tiled", label: "Tiled" },
];
const ANGLES: Option<WmAngle>[] = [
  { value: "diagonal", label: "Diagonal" },
  { value: "horizontal", label: "Horizontal" },
];
const SIZES: Option<WmSize>[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];
type PageMode = "all" | "custom";
const PAGE_MODES: Option<PageMode>[] = [
  { value: "all", label: "All pages" },
  { value: "custom", label: "Choose pages" },
];

type Result = { blob: Blob; url: string; name: string };

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";

/** Approximate live preview drawn with SVG on top of the page-1 image. */
function Preview(p: { thumb?: string; text: string; layout: WmLayout; angle: WmAngle; size: WmSize; opacity: number; color: string }) {
  const [aspect, setAspect] = useState(1 / 1.414); // width / height, A4 until the image loads
  const W = 1000;
  const H = W / aspect;
  const alpha = p.angle === "diagonal" ? 45 : 0;
  const len = Math.max(1, p.text.length);
  const items: { x: number; y: number; tl: number }[] = [];

  if (p.layout === "center") {
    const span = alpha ? Math.hypot(W, H) : W;
    items.push({ x: W / 2, y: H / 2, tl: span * SIZE_FRACTION[p.size] });
  } else {
    const tl = Math.min(W, H) * SIZE_FRACTION[p.size] * TILE_FACTOR;
    const fs = tl / (0.62 * len);
    const stepX = tl + fs * 3;
    const stepY = fs * 5;
    const R = Math.hypot(W, H) / 2 + tl;
    const cos = Math.cos((-alpha * Math.PI) / 180);
    const sin = Math.sin((-alpha * Math.PI) / 180);
    let row = 0;
    for (let v = -R; v <= R; v += stepY, row++) {
      for (let u = -R + (row % 2 ? stepX / 2 : 0); u <= R; u += stepX) {
        const x = W / 2 + u * cos - v * sin;
        const y = H / 2 + u * sin + v * cos;
        if (x > -tl && x < W + tl && y > -tl && y < H + tl) items.push({ x, y, tl });
      }
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-[16rem] overflow-hidden rounded border border-slate-300 bg-white shadow-sm" style={{ aspectRatio: `${aspect}` }}>
      {p.thumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.thumb}
          alt=""
          className="absolute inset-0 h-full w-full"
          onLoad={(e) => setAspect(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
        />
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
        {p.text.trim() &&
          items.map((it, i) => (
            <text
              key={i}
              x={it.x}
              y={it.y}
              textAnchor="middle"
              dominantBaseline="central"
              textLength={it.tl}
              lengthAdjust="spacingAndGlyphs"
              fontFamily="Helvetica, Arial, sans-serif"
              fontWeight="700"
              fontSize={it.tl / (0.62 * len)}
              fill={p.color}
              fillOpacity={p.opacity}
              transform={`rotate(${-alpha} ${it.x} ${it.y})`}
            >
              {p.text}
            </text>
          ))}
      </svg>
    </div>
  );
}

export default function WatermarkTool() {
  const pdf = usePdfPages(1); // only page 1 is needed for the preview
  const [text, setText] = useState("CONFIDENTIAL");
  const [layout, setLayout] = useState<WmLayout>("center");
  const [angle, setAngle] = useState<WmAngle>("diagonal");
  const [size, setSize] = useState<WmSize>("medium");
  const [opacity, setOpacity] = useState(25);
  const [color, setColor] = useState(COLORS[0].value);
  const [pageMode, setPageMode] = useState<PageMode>("all");
  const [rangeText, setRangeText] = useState("");

  const [result, setResult] = useState<Result | null>(null);
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

  function handleFiles(files: File[]) {
    if (!files[0]) return;
    clearResult();
    void pdf.open(files[0]);
  }

  // A PDF sent from the homepage or another tool
  useHandoff(handleFiles);

  function reset() {
    clearResult();
    pdf.reset();
  }

  const change = <T,>(setter: (v: T) => void) => (v: T) => {
    clearResult();
    setter(v);
  };

  const pages = pageMode === "custom" ? parsePageRange(rangeText, pdf.pageCount) : null;
  const rangeInvalid = pageMode === "custom" && !pages;
  const canRun = text.trim().length > 0 && !rangeInvalid && !processing;

  async function run() {
    if (!pdf.file) return;
    clearResult();
    cancelRef.current = false;
    setProcessing(true);
    try {
      const blob = await addWatermark(
        pdf.file,
        { text: text.trim(), layout, angle, size, opacity: opacity / 100, color, pages },
        (done, total) => setStatus(done < total ? `Stamping page ${done + 1} of ${total}…` : "Saving PDF…"),
        () => cancelRef.current,
      );
      if (!blob) {
        setStatus("Cancelled.");
        return;
      }
      const url = URL.createObjectURL(blob);
      resultUrl.current = url;
      setResult({ blob, url, name: safeDownloadName(`${baseName(pdf.file.name)}-watermarked`, "pdf") });
      setStatus("");
    } catch (e) {
      setStatus("");
      setError(e instanceof Error ? e.message : "Something went wrong while adding the watermark.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      {!pdf.file && !pdf.opening && (
        <Dropzone accept={["pdf"]} multiple={false} maxSizeMB={100} onFiles={handleFiles} title="Drop a PDF here" />
      )}

      {pdf.opening && (
        <p className="flex items-center gap-2 text-sm text-slate-700" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Opening PDF…
        </p>
      )}

      {pdf.file && (
        <>
          <PdfFileCard file={pdf.file} pageCount={pdf.pageCount} onReset={reset} disabled={processing} />

          <section aria-labelledby="wm-heading" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 id="wm-heading" className="text-lg font-semibold text-slate-900">
              Watermark
            </h2>

            <div className="grid gap-6 md:grid-cols-[1fr_auto]">
              <div className="space-y-5">
                <div className="max-w-md">
                  <label htmlFor="wm-text" className="block text-sm font-medium text-slate-700">
                    Text
                  </label>
                  <input
                    id="wm-text"
                    type="text"
                    value={text}
                    maxLength={40}
                    onChange={(e) => change(setText)(e.target.value)}
                    className={inputClass}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {PRESETS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => change(setText)(t)}
                        className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:border-blue-400 hover:bg-blue-50"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-5">
                  <Segmented legend="Layout" name="wm-layout" options={LAYOUTS} value={layout} onChange={change(setLayout)} />
                  <Segmented legend="Angle" name="wm-angle" options={ANGLES} value={angle} onChange={change(setAngle)} />
                  <Segmented legend="Size" name="wm-size" options={SIZES} value={size} onChange={change(setSize)} />
                </div>

                <div className="flex flex-wrap items-end gap-6">
                  <div className="w-56">
                    <label htmlFor="wm-opacity" className="block text-sm font-medium text-slate-700">
                      Opacity: <span className="font-semibold">{opacity}%</span>
                    </label>
                    <input
                      id="wm-opacity"
                      type="range"
                      min={10}
                      max={100}
                      value={opacity}
                      onChange={(e) => change(setOpacity)(Number(e.target.value))}
                      className="mt-3 w-full accent-blue-600"
                    />
                  </div>
                  <fieldset>
                    <legend className="text-sm font-medium text-slate-700">Colour</legend>
                    <div className="mt-2 flex gap-2">
                      {COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => change(setColor)(c.value)}
                          aria-label={c.label}
                          aria-pressed={color === c.value}
                          className={`h-8 w-8 rounded-full border-2 ${color === c.value ? "border-blue-500 ring-2 ring-blue-200" : "border-white"}`}
                          style={{ background: c.value }}
                        />
                      ))}
                    </div>
                  </fieldset>
                </div>

                <div className="space-y-2">
                  <Segmented legend="Pages" name="wm-pages" options={PAGE_MODES} value={pageMode} onChange={change(setPageMode)} />
                  {pageMode === "custom" && (
                    <div className="max-w-xs">
                      <input
                        type="text"
                        value={rangeText}
                        onChange={(e) => change(setRangeText)(e.target.value)}
                        placeholder="e.g. 1-3, 5"
                        aria-label="Pages to watermark"
                        className={inputClass}
                      />
                      {rangeInvalid && rangeText.trim() && (
                        <p className="mt-1 text-sm text-amber-700">Enter pages between 1 and {pdf.pageCount}.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <figure className="w-full md:w-64">
                <Preview thumb={pdf.thumbs[1]} text={text} layout={layout} angle={angle} size={size} opacity={opacity / 100} color={color} />
                <figcaption className="mt-2 text-center text-xs text-slate-500">Preview of page 1</figcaption>
              </figure>
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
                  disabled={!canRun}
                  className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add watermark
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

      {(pdf.error || error) && (
        <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {pdf.error || error}
        </p>
      )}

      {result && (
        <section aria-label="Your watermarked PDF" className="flex flex-wrap items-center gap-4 rounded-2xl border border-green-200 bg-green-50 p-5">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900">{result.name}</p>
            <p className="text-sm text-slate-600">
              {pdf.pageCount} pages · {formatBytes(result.blob.size)}
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
            <NextSteps files={[blobToFile(result.blob, result.name)]} kind="pdf" current="/watermark-pdf" />
          </div>
        </section>
      )}
    </div>
  );
}
