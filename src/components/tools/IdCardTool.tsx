"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { Download, EyeOff, FileText, ImageIcon, KeyRound, Loader2, RotateCcw, RotateCw, Undo2 } from "lucide-react";
import Dropzone from "@/components/Dropzone";
import ImageCropper, { type CropRect } from "@/components/ImageCropper";
import Segmented, { type Option } from "@/components/Segmented";
import { useHandoff } from "@/hooks/useHandoff";
import { downloadBlob } from "@/lib/download";
import { detectFileKind, displayName } from "@/lib/files";
import { describePdfjsError, openPdf, passwordProblem, renderPage, type OpenedPdf } from "@/lib/pdfRender";
import { STICKY_ACTIONS } from "@/lib/ui";
import {
  buildJpg,
  buildPdf,
  cardAspect,
  clampCrop,
  composePage,
  copyOptions,
  defaultCrop,
  loadImageSource,
  renderCard,
  rotateSource,
  type Arrangement,
  type CardInput,
  type CardShape,
  type Rect,
  type Side,
} from "@/lib/idCard";

type Slot = {
  base: HTMLCanvasElement; // as loaded, not rotated
  page?: number; // PDF page it came from
  quarter: number; // quarter turns
  fine: number; // straightening, degrees
  source: HTMLCanvasElement; // rotated
  crop: CropRect;
  masks: Rect[];
};
type Slots = Record<Side, Slot | null>;

const PDF_RENDER_SCALE = 300 / 72; // render PDF pages at 300 DPI
const PDF_MAX_SIDE = 3600;

const SIDES: Option<Side>[] = [
  { value: "front", label: "Front side" },
  { value: "back", label: "Back side" },
];
const SHAPES: Option<CardShape>[] = [
  { value: "landscape", label: "Horizontal" },
  { value: "portrait", label: "Vertical" },
];
const ARRANGEMENTS: Option<Arrangement>[] = [
  { value: "side", label: "Side by side" },
  { value: "stacked", label: "One below the other" },
];
const COLOURS: Option<"colour" | "bw">[] = [
  { value: "colour", label: "Colour" },
  { value: "bw", label: "Black & white" },
];

function makeSlot(base: HTMLCanvasElement, aspect: number, page?: number, area?: Rect): Slot {
  return { base, page, quarter: 0, fine: 0, source: base, crop: defaultCrop(base, aspect, area), masks: [] };
}

/** Keep the crop's centre and width, change its shape. */
function reshape(crop: CropRect, src: HTMLCanvasElement, aspect: number): CropRect {
  let w = crop.w;
  let h = w / aspect;
  if (h > src.height) {
    h = src.height * 0.9;
    w = h * aspect;
  }
  if (w > src.width) {
    w = src.width * 0.9;
    h = w / aspect;
  }
  return clampCrop({ x: crop.x + crop.w / 2 - w / 2, y: crop.y + crop.h / 2 - h / 2, w, h }, src);
}

export default function IdCardTool() {
  const [kind, setKind] = useState<"none" | "images" | "pdf">("none");
  const [slots, setSlots] = useState<Slots>({ front: null, back: null });
  const [active, setActive] = useState<Side>("front");
  const [includeBack, setIncludeBack] = useState(true);
  const [shape, setShape] = useState<CardShape>("landscape");
  const [arrangement, setArrangement] = useState<Arrangement>("side");
  const [copies, setCopies] = useState(1);
  const [colour, setColour] = useState<"colour" | "bw">("colour");
  const [cutLines, setCutLines] = useState(true);
  const [covering, setCovering] = useState(false);

  const [pdfName, setPdfName] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [locked, setLocked] = useState<{ file: File; wrong: boolean } | null>(null);
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");

  const pdfRef = useRef<OpenedPdf | null>(null);
  const pageCache = useRef(new Map<number, HTMLCanvasElement>());
  const generation = useRef(0);

  const aspect = cardAspect(shape);
  const hasBack = includeBack && slots.back !== null;
  const allowedCopies = copyOptions(shape, arrangement, hasBack);
  const settings = { shape, arrangement, copies, grayscale: colour === "bw", cutLines };

  // Close the PDF when leaving the page
  useEffect(() => () => void pdfRef.current?.close(), []);

  // If the chosen number of copies no longer fits, pick the largest that does
  useEffect(() => {
    if (!allowedCopies.includes(copies)) setCopies(allowedCopies[allowedCopies.length - 1] ?? 1);
  }, [allowedCopies, copies]);

  function cardInput(side: Side): CardInput | null {
    const s = slots[side];
    return s ? { source: s.source, crop: s.crop, masks: s.masks } : null;
  }

  // Small preview of the A4 page, redrawn shortly after any change
  useEffect(() => {
    const front = cardInput("front");
    if (!front) {
      setPreview("");
      return;
    }
    const t = setTimeout(() => {
      try {
        const canvas = composePage({ front, back: hasBack ? cardInput("back") : null }, settings, 45);
        setPreview(canvas.toDataURL("image/jpeg", 0.85));
        canvas.width = canvas.height = 0;
      } catch {
        setPreview("");
      }
    }, 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, hasBack, shape, arrangement, copies, colour, cutLines]);

  async function reset() {
    generation.current++;
    await pdfRef.current?.close();
    pdfRef.current = null;
    pageCache.current.clear();
    setKind("none");
    setSlots({ front: null, back: null });
    setActive("front");
    setIncludeBack(true);
    setCovering(false);
    setLocked(null);
    setPassword("");
    setPdfName("");
    setPageCount(0);
    setError("");
    setStatus("");
  }

  async function pdfPage(n: number): Promise<HTMLCanvasElement> {
    const cached = pageCache.current.get(n);
    if (cached) return cached;
    const opened = pdfRef.current;
    if (!opened) throw new Error("The PDF is no longer open.");
    const { blob } = await renderPage(opened.doc, n, PDF_RENDER_SCALE, "image/jpeg", 0.92);
    const canvas = await loadImageSource(blob, PDF_MAX_SIDE);
    pageCache.current.set(n, canvas);
    return canvas;
  }

  async function startPdf(file: File, pw?: string) {
    const gen = ++generation.current;
    setBusy(true);
    setError("");
    setStatus("Opening the PDF…");
    try {
      let opened: OpenedPdf;
      try {
        opened = await openPdf(file, pw);
      } catch (e) {
        const p = passwordProblem(e);
        if (gen !== generation.current) return;
        if (p) {
          setLocked({ file, wrong: p === "wrong" });
          return;
        }
        throw e;
      }
      if (gen !== generation.current) {
        await opened.close();
        return;
      }
      await pdfRef.current?.close();
      pdfRef.current = opened;
      pageCache.current.clear();
      setLocked(null);
      setPassword("");
      setStatus("Preparing the page…");

      const pages = opened.doc.numPages;
      const first = await pdfPage(1);
      if (gen !== generation.current) return;
      let front: Slot;
      let back: Slot;
      if (pages === 1 && first.height > first.width) {
        // Like an e-Aadhaar: front and back sit side by side near the bottom of the page
        const bottom = { y: first.height * 0.62, h: first.height * 0.38 };
        front = makeSlot(first, aspect, 1, { x: 0, w: first.width / 2, ...bottom });
        back = makeSlot(first, aspect, 1, { x: first.width / 2, w: first.width / 2, ...bottom });
      } else {
        front = makeSlot(first, aspect, 1);
        back = pages > 1 ? makeSlot(await pdfPage(2), aspect, 2) : makeSlot(first, aspect, 1);
      }
      if (gen !== generation.current) return;
      setKind("pdf");
      setPdfName(file.name);
      setPageCount(pages);
      setSlots({ front, back });
      setActive("front");
    } catch (e) {
      if (gen === generation.current) setError(describePdfjsError(e));
    } finally {
      if (gen === generation.current) {
        setBusy(false);
        setStatus("");
      }
    }
  }

  async function addImages(files: File[], target?: Side) {
    const gen = generation.current;
    setBusy(true);
    setError("");
    try {
      const loaded: HTMLCanvasElement[] = [];
      for (const f of files.slice(0, 2)) loaded.push(await loadImageSource(f));
      if (gen !== generation.current) return;
      setKind("images");
      setSlots((prev) => {
        const next = { ...prev };
        const order: Side[] = target ? [target] : prev.front ? ["back"] : ["front", "back"];
        loaded.forEach((canvas, i) => {
          const side = order[i];
          if (side) next[side] = makeSlot(canvas, aspect);
        });
        return next;
      });
      if (target) setActive(target);
    } catch {
      if (gen === generation.current) setError("This image could not be opened. Try a JPG or PNG photo.");
    } finally {
      if (gen === generation.current) setBusy(false);
    }
  }

  async function handleFiles(files: File[], target?: Side) {
    const kinds = await Promise.all(files.map((f) => detectFileKind(f)));
    const pdf = files.find((_, i) => kinds[i] === "pdf");
    if (pdf) {
      if (kind !== "none") await reset();
      if (files.length > 1) setError("Using the PDF only. To use photos instead, add them without the PDF.");
      await startPdf(pdf);
      return;
    }
    if (kind === "pdf") await reset();
    await addImages(files, target);
  }

  // Files sent from the homepage or another tool
  useHandoff((files) => void handleFiles(files));

  function updateSlot(side: Side, change: (s: Slot) => Slot) {
    setSlots((prev) => {
      const s = prev[side];
      return s ? { ...prev, [side]: change(s) } : prev;
    });
  }

  function turn(side: Side, by: number) {
    updateSlot(side, (s) => {
      const quarter = (s.quarter + by + 4) % 4;
      const source = rotateSource(s.base, quarter, s.fine);
      return { ...s, quarter, source, crop: defaultCrop(source, aspect), masks: [] };
    });
  }

  function straighten(side: Side, fine: number) {
    updateSlot(side, (s) => {
      const source = rotateSource(s.base, s.quarter, fine);
      return { ...s, fine, source, crop: clampCrop(s.crop, source) };
    });
  }

  async function choosePage(side: Side, page: number) {
    setBusy(true);
    try {
      const base = await pdfPage(page);
      setSlots((prev) => ({ ...prev, [side]: makeSlot(base, aspect, page) }));
    } catch (e) {
      setError(describePdfjsError(e));
    } finally {
      setBusy(false);
    }
  }

  function changeShape(next: CardShape) {
    setShape(next);
    const a = cardAspect(next);
    setSlots((prev) => ({
      front: prev.front ? { ...prev.front, crop: reshape(prev.front.crop, prev.front.source, a), masks: [] } : null,
      back: prev.back ? { ...prev.back, crop: reshape(prev.back.crop, prev.back.source, a), masks: [] } : null,
    }));
  }

  async function download(type: "pdf" | "jpg") {
    const front = cardInput("front");
    if (!front) return;
    setBusy(true);
    setError("");
    setStatus(type === "pdf" ? "Creating the PDF…" : "Creating the image…");
    try {
      const cards = { front, back: hasBack ? cardInput("back") : null };
      const blob = type === "pdf" ? await buildPdf(cards, settings) : await buildJpg(cards, settings);
      downloadBlob(blob, type === "pdf" ? "id-card-print.pdf" : "id-card-print.jpg");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  const slot = slots[active];
  const btn =
    "inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

  return (
    <div className="space-y-6">
      {kind === "none" && !locked && (
        <Dropzone
          accept={["jpeg", "png", "webp", "pdf"]}
          multiple
          maxFiles={2}
          maxSizeMB={50}
          onFiles={(f) => void handleFiles(f)}
          title="Add photos of your card, or a PDF"
          hint="Front and back photos (JPG, PNG, WebP), or a PDF such as e-Aadhaar · stays on your device"
        />
      )}

      {locked && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (password) void startPdf(locked.file, password);
          }}
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"
        >
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <KeyRound className="h-5 w-5" aria-hidden="true" /> This PDF has a password
          </h2>
          <p className="text-sm text-slate-600">
            For e-Aadhaar, the password is the <strong>first 4 letters of your name in capitals</strong> followed by your{" "}
            <strong>year of birth</strong>, for example <code className="rounded bg-slate-100 px-1">SUNI1990</code>. It&apos;s used
            only in this browser to open the file.
          </p>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
              autoFocus
              className="mt-1 block w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-base"
            />
          </label>
          {locked.wrong && <p className="text-sm font-medium text-red-700">That password didn&apos;t work. Check capitals and try again.</p>}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={!password || busy}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Open PDF
            </button>
            <button type="button" onClick={() => void reset()} className={btn}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {kind !== "none" && (
        <>
          <section aria-labelledby="crop-heading" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="crop-heading" className="text-lg font-semibold text-slate-900">
                  1. Mark each side of the card
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {kind === "pdf" ? (
                    <>
                      <FileText className="mr-1 inline h-4 w-4" aria-hidden="true" />
                      {displayName(pdfName)} · drag the box over the card, and pull a corner to resize.
                    </>
                  ) : (
                    "Drag the box over the card, and pull a corner to resize."
                  )}
                </p>
              </div>
              <button type="button" onClick={() => void reset()} className={btn} disabled={busy}>
                Start over
              </button>
            </div>

            <Segmented
              legend="Editing"
              name="id-side"
              options={SIDES.map((o) => ({ ...o, label: o.value === "back" && !slots.back ? "Back side (add)" : o.label }))}
              value={active}
              onChange={(v) => {
                setCovering(false);
                setActive(v);
              }}
            />

            {slot ? (
              <div className="space-y-4">
                {kind === "pdf" && pageCount > 1 && (
                  <label className="block text-sm font-medium text-slate-700">
                    Page
                    <select
                      value={slot.page ?? 1}
                      onChange={(e) => void choosePage(active, Number(e.target.value))}
                      disabled={busy}
                      className="ml-2 rounded-lg border border-slate-300 px-2 py-1.5"
                    >
                      {Array.from({ length: pageCount }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <ImageCropper
                  source={slot.source}
                  aspect={aspect}
                  crop={slot.crop}
                  onChange={(crop) => updateSlot(active, (s) => ({ ...s, crop }))}
                  label={`Crop box for the ${active} side`}
                />

                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" className={btn} onClick={() => turn(active, -1)}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" /> Left
                  </button>
                  <button type="button" className={btn} onClick={() => turn(active, 1)}>
                    <RotateCw className="h-4 w-4" aria-hidden="true" /> Right
                  </button>
                  <label className="flex min-w-56 flex-1 items-center gap-3 text-sm text-slate-700">
                    Straighten
                    <input
                      type="range"
                      min={-10}
                      max={10}
                      step={0.5}
                      value={slot.fine}
                      onChange={(e) => straighten(active, Number(e.target.value))}
                      className="flex-1 accent-blue-600"
                    />
                    <span className="w-12 text-right tabular-nums">{slot.fine}°</span>
                  </label>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">How the {active} side will print</p>
                  <CardMaskEditor
                    input={{ source: slot.source, crop: slot.crop, masks: slot.masks }}
                    shape={shape}
                    grayscale={colour === "bw"}
                    covering={covering}
                    onAddMask={(m) => updateSlot(active, (s) => ({ ...s, masks: [...s.masks, m] }))}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setCovering((c) => !c)}
                      aria-pressed={covering}
                      className={covering ? "inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white" : btn}
                    >
                      <EyeOff className="h-4 w-4" aria-hidden="true" /> {covering ? "Done covering" : "Cover part of the card"}
                    </button>
                    {slot.masks.length > 0 && (
                      <button type="button" className={btn} onClick={() => updateSlot(active, (s) => ({ ...s, masks: s.masks.slice(0, -1) }))}>
                        <Undo2 className="h-4 w-4" aria-hidden="true" /> Undo cover
                      </button>
                    )}
                  </div>
                  {covering ? (
                    <p className="text-sm text-slate-600">Drag across the card preview to draw a black box over the part to hide.</p>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Tip: many places accept an Aadhaar copy that shows only the last 4 digits. Cover the first 8 digits to share less.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Dropzone
                  accept={["jpeg", "png", "webp"]}
                  multiple={false}
                  maxSizeMB={50}
                  onFiles={(f) => void handleFiles(f, "back")}
                  title="Add a photo of the back side"
                  hint="JPG, PNG or WebP · or print the front side only"
                />
              </div>
            )}
          </section>

          <section aria-labelledby="page-heading" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 id="page-heading" className="text-lg font-semibold text-slate-900">
              2. Page layout
            </h2>
            <div className="flex flex-wrap gap-5">
              <Segmented legend="Card" name="id-shape" options={SHAPES} value={shape} onChange={changeShape} />
              {hasBack && (
                <Segmented legend="Front and back" name="id-arrange" options={ARRANGEMENTS} value={arrangement} onChange={setArrangement} />
              )}
              <Segmented
                legend="Copies on the page"
                name="id-copies"
                options={allowedCopies.map((n) => ({ value: String(n), label: String(n) }))}
                value={String(copies)}
                onChange={(v) => setCopies(Number(v))}
              />
              <Segmented legend="Print" name="id-colour" options={COLOURS} value={colour} onChange={setColour} />
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={cutLines} onChange={(e) => setCutLines(e.target.checked)} className="h-4 w-4 accent-blue-600" />
                Dotted cut lines
              </label>
              {slots.back && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeBack}
                    onChange={(e) => setIncludeBack(e.target.checked)}
                    className="h-4 w-4 accent-blue-600"
                  />
                  Include back side
                </label>
              )}
            </div>

            {preview && (
              <figure className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Preview of the A4 page"
                  className="mx-auto w-full max-w-xs rounded border border-slate-300 shadow-sm"
                />
                <figcaption className="text-center text-xs text-slate-500">
                  A4 page · cards print at real size (85.6 × 54 mm). Print at 100% / &quot;Actual size&quot;, not &quot;Fit to page&quot;.
                </figcaption>
              </figure>
            )}

            <div className={STICKY_ACTIONS}>
              <button
                type="button"
                onClick={() => void download("pdf")}
                disabled={busy || !slots.front}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => void download("jpg")}
                disabled={busy || !slots.front}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <ImageIcon className="h-4 w-4" aria-hidden="true" /> Download JPG
              </button>
            </div>
          </section>
        </>
      )}

      <div role="status" aria-live="polite" className="text-sm text-slate-700">
        {status && (
          <p className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {status}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {error}
        </p>
      )}
    </div>
  );
}

/** The cropped card as it will print; in "covering" mode, drag to add a black box. */
function CardMaskEditor({
  input,
  shape,
  grayscale,
  covering,
  onAddMask,
}: {
  input: CardInput;
  shape: CardShape;
  grayscale: boolean;
  covering: boolean;
  onAddMask: (m: Rect) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<Rect | null>(null);

  useEffect(() => {
    const view = canvasRef.current;
    if (!view) return;
    const card = renderCard(input, shape, grayscale, 120);
    view.width = card.width;
    view.height = card.height;
    const ctx = view.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(card, 0, 0);
    card.width = card.height = 0;
    if (draft) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(draft.x * view.width, draft.y * view.height, draft.w * view.width, draft.h * view.height);
    }
  }, [input.source, input.crop, input.masks, shape, grayscale, draft]);

  function point(e: PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1),
      y: Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1),
    };
  }

  function rectFrom(a: { x: number; y: number }, b: { x: number; y: number }): Rect {
    return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
  }

  return (
    <canvas
      ref={canvasRef}
      aria-label={covering ? "Card preview. Drag to draw a box that hides part of the card." : "Preview of the cropped card"}
      className={`block h-auto w-full max-w-sm rounded-lg border border-slate-300 shadow-sm ${covering ? "cursor-crosshair touch-none ring-2 ring-slate-900" : ""}`}
      onPointerDown={(e) => {
        if (!covering) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = point(e);
      }}
      onPointerMove={(e) => {
        if (start.current) setDraft(rectFrom(start.current, point(e)));
      }}
      onPointerUp={(e) => {
        if (!start.current) return;
        const r = rectFrom(start.current, point(e));
        start.current = null;
        setDraft(null);
        if (r.w > 0.02 && r.h > 0.02) onAddMask(r);
      }}
      onPointerCancel={() => {
        start.current = null;
        setDraft(null);
      }}
    />
  );
}
