"use client";

// Create a signature: draw it, type it, or upload a photo of it.
// Returns a PNG (data URL) with a transparent background for Draw and Type.
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export type Signature = { src: string; mime: "image/png" | "image/jpeg"; aspect: number };

type Tab = "draw" | "type" | "upload";
const COLORS = ["#111827", "#1d4ed8"];
const TYPE_STYLES = [
  "italic 64px 'Segoe Script', 'Brush Script MT', 'Lucida Handwriting', cursive",
  "64px 'Lucida Handwriting', 'Segoe Script', 'Apple Chancery', cursive",
  "italic 600 58px Georgia, 'Times New Roman', serif",
];

/** Crop away empty transparent edges, with a little padding. */
function trimCanvas(src: HTMLCanvasElement): HTMLCanvasElement | null {
  const ctx = src.getContext("2d");
  if (!ctx) return null;
  const { width, height } = src;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null; // empty
  const pad = 8;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);
  const out = document.createElement("canvas");
  out.width = maxX - minX + 1;
  out.height = maxY - minY + 1;
  out.getContext("2d")?.drawImage(src, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

export default function SignatureDialog({ onDone, onClose }: { onDone: (s: Signature) => void; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("draw");
  const [color, setColor] = useState(COLORS[0]);
  const [hasInk, setHasInk] = useState(false);
  const [name, setName] = useState("");
  const [style, setStyle] = useState(0);
  const [upload, setUpload] = useState<Signature | null>(null);
  const [error, setError] = useState("");
  const padRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<{ x: number; y: number } | null>(null);

  // Close with Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function padPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = e.currentTarget;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  }

  function clearPad() {
    const c = padRef.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setHasInk(false);
  }

  function onPickFile(f: File | undefined) {
    setError("");
    if (!f) return;
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      const scale = Math.min(1, 800 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
      const png = f.type === "image/png";
      setUpload({
        src: c.toDataURL(png ? "image/png" : "image/jpeg", 0.92),
        mime: png ? "image/png" : "image/jpeg",
        aspect: c.width / c.height,
      });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      setError("That image could not be opened. Try a JPG or PNG.");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  function finish() {
    setError("");
    let canvas: HTMLCanvasElement | null = null;
    if (tab === "draw") {
      canvas = padRef.current ? trimCanvas(padRef.current) : null;
      if (!canvas) return setError("Draw your signature first.");
    } else if (tab === "type") {
      if (!name.trim()) return setError("Type your name first.");
      const c = document.createElement("canvas");
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.font = TYPE_STYLES[style];
      const w = Math.ceil(ctx.measureText(name).width) + 40;
      c.width = w;
      c.height = 110;
      ctx.font = TYPE_STYLES[style]; // resizing a canvas resets its settings
      ctx.fillStyle = color;
      ctx.textBaseline = "middle";
      ctx.fillText(name, 20, 55);
      canvas = trimCanvas(c);
      if (!canvas) return setError("Could not create the signature.");
    } else {
      if (!upload) return setError("Choose an image first.");
      return onDone(upload);
    }
    onDone({ src: canvas.toDataURL("image/png"), mime: "image/png", aspect: canvas.width / canvas.height });
  }

  const tabBtn = (t: Tab, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === t}
      onClick={() => {
        setTab(t);
        setError("");
      }}
      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sig-title"
        className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="sig-title" className="text-lg font-semibold text-slate-900">
            Create your signature
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div role="tablist" className="mt-4 flex gap-1 rounded-lg bg-slate-100 p-1">
          {tabBtn("draw", "Draw")}
          {tabBtn("type", "Type")}
          {tabBtn("upload", "Upload")}
        </div>

        {tab !== "upload" && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            Colour:
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c === COLORS[0] ? "Black" : "Blue"}
                aria-pressed={color === c}
                className={`h-6 w-6 rounded-full border-2 ${color === c ? "border-blue-500 ring-2 ring-blue-200" : "border-white"}`}
                style={{ background: c }}
              />
            ))}
          </div>
        )}

        <div className="mt-3">
          {tab === "draw" && (
            <>
              <canvas
                ref={padRef}
                width={600}
                height={200}
                className="w-full touch-none rounded-lg border-2 border-dashed border-slate-300 bg-slate-50"
                aria-label="Signature pad: draw with your mouse or finger"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  drawing.current = padPoint(e);
                }}
                onPointerMove={(e) => {
                  const last = drawing.current;
                  const ctx = e.currentTarget.getContext("2d");
                  if (!last || !ctx) return;
                  const p = padPoint(e);
                  ctx.strokeStyle = color;
                  ctx.lineWidth = 3.5;
                  ctx.lineCap = "round";
                  ctx.lineJoin = "round";
                  ctx.beginPath();
                  ctx.moveTo(last.x, last.y);
                  ctx.lineTo(p.x, p.y);
                  ctx.stroke();
                  drawing.current = p;
                  if (!hasInk) setHasInk(true);
                }}
                onPointerUp={() => {
                  drawing.current = null;
                }}
              />
              <div className="mt-1 flex justify-between text-xs text-slate-500">
                <span>Sign with your mouse or finger</span>
                <button type="button" onClick={clearPad} className="font-medium text-blue-700 hover:underline">
                  Clear
                </button>
              </div>
            </>
          )}

          {tab === "type" && (
            <div className="space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={60}
                aria-label="Your name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <div className="space-y-2">
                {TYPE_STYLES.map((f, i) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setStyle(i)}
                    aria-pressed={style === i}
                    className={`block w-full truncate rounded-lg border-2 px-4 py-2 text-left ${
                      style === i ? "border-blue-600 bg-blue-50" : "border-slate-200"
                    }`}
                    style={{ font: f.replace(/\d+px/, "32px"), color }}
                  >
                    {name || "Your name"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "upload" && (
            <div className="space-y-3">
              <label className="block cursor-pointer rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600 hover:border-blue-400">
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => onPickFile(e.target.files?.[0])} />
                {upload ? "Choose a different image" : "Choose a photo or scan of your signature"}
              </label>
              {upload && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={upload.src} alt="Your signature" className="mx-auto max-h-28 object-contain" />
              )}
              <p className="text-xs text-slate-500">Tip: sign on plain white paper and photograph it in good light.</p>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            type="button"
            onClick={finish}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Use signature
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-slate-500">Your signature stays on this device and is never uploaded.</p>
      </div>
    </div>
  );
}
