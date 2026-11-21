"use client";

// Crop box over an image: drag inside to move, drag a corner to resize.
// Works with mouse and touch. With `aspect`, the box keeps that shape
// (e.g. an ID card or passport photo). Shared by the ID card and photo tools.
import { useEffect, useRef } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import type { CropRect } from "@/lib/image";

export type { CropRect };

type Corner = "nw" | "ne" | "sw" | "se";
type Drag = { mode: "move" | Corner; startX: number; startY: number; start: CropRect; scale: number };

const MIN_FRACTION = 0.04; // smallest box: 4% of the image width
const DISPLAY_MAX = 1200; // preview canvas width in pixels

export default function ImageCropper({
  source,
  aspect,
  crop,
  onChange,
  label,
  guide,
}: {
  source: HTMLCanvasElement;
  aspect: number | null; // width ÷ height, or null for a free shape
  crop: CropRect;
  onChange: (c: CropRect) => void;
  label: string;
  guide?: "face"; // draw an oval where the head should go (passport photos)
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const W = source.width;
  const H = source.height;

  // Draw a reduced copy of the image for display
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const s = Math.min(1, DISPLAY_MAX / W);
    c.width = Math.round(W * s);
    c.height = Math.round(H * s);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, c.width, c.height);
  }, [source, W, H]);

  function begin(e: PointerEvent<HTMLElement>, mode: Drag["mode"]) {
    const frame = frameRef.current;
    if (!frame) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, startX: e.clientX, startY: e.clientY, start: crop, scale: W / frame.getBoundingClientRect().width };
  }

  function move(e: PointerEvent<HTMLElement>) {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) * d.scale;
    const dy = (e.clientY - d.startY) * d.scale;
    const s = d.start;

    if (d.mode === "move") {
      onChange({ ...s, x: clamp(s.x + dx, 0, W - s.w), y: clamp(s.y + dy, 0, H - s.h) });
      return;
    }

    // Resize from a corner; the opposite corner stays fixed
    const left = d.mode === "nw" || d.mode === "sw";
    const top = d.mode === "nw" || d.mode === "ne";
    const ax = left ? s.x + s.w : s.x; // anchor
    const ay = top ? s.y + s.h : s.y;
    const roomW = left ? ax : W - ax;
    const roomH = top ? ay : H - ay;
    const minW = W * MIN_FRACTION;

    let w = s.w + (left ? -dx : dx);
    let h = s.h + (top ? -dy : dy);
    if (aspect) {
      // Follow whichever direction the finger moved more
      w = Math.abs(w - s.w) >= Math.abs(h * aspect - s.w) ? w : h * aspect;
      w = clamp(w, Math.min(minW, roomW, roomH * aspect), Math.min(roomW, roomH * aspect));
      h = w / aspect;
    } else {
      w = clamp(w, Math.min(minW, roomW), roomW);
      h = clamp(h, Math.min(minW, roomH), roomH);
    }
    onChange({ x: left ? ax - w : ax, y: top ? ay - h : ay, w, h });
  }

  function end() {
    drag.current = null;
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const step = (e.shiftKey ? 0.05 : 0.01) * W;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    onChange({ ...crop, x: clamp(crop.x + m[0], 0, W - crop.w), y: clamp(crop.y + m[1], 0, H - crop.h) });
  }

  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  const corners: Corner[] = ["nw", "ne", "sw", "se"];
  const cornerPos: Record<Corner, string> = {
    nw: "-left-3.5 -top-3.5 cursor-nwse-resize",
    ne: "-right-3.5 -top-3.5 cursor-nesw-resize",
    sw: "-left-3.5 -bottom-3.5 cursor-nesw-resize",
    se: "-right-3.5 -bottom-3.5 cursor-nwse-resize",
  };

  return (
    <div ref={frameRef} className="relative mx-auto w-full max-w-2xl select-none overflow-hidden rounded-lg bg-slate-100">
      <canvas ref={canvasRef} className="block h-auto w-full" aria-hidden="true" />
      <div
        role="group"
        tabIndex={0}
        aria-label={`${label}. Drag to move, drag a corner to resize, or use the arrow keys.`}
        onPointerDown={(e) => begin(e, "move")}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onKeyDown={onKey}
        className="absolute cursor-move touch-none border-2 border-white outline-none ring-2 ring-blue-600 focus-visible:ring-4"
        style={{
          left: pct(crop.x, W),
          top: pct(crop.y, H),
          width: pct(crop.w, W),
          height: pct(crop.h, H),
          boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.55)", // darkens everything outside the box
        }}
      >
        {guide === "face" && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-[20%] top-[8%] h-[70%] w-[60%] rounded-[50%] border-2 border-dashed border-white/90"
          />
        )}
        {corners.map((c) => (
          <span
            key={c}
            onPointerDown={(e) => begin(e, c)}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            className={`absolute h-7 w-7 touch-none rounded-full border-2 border-white bg-blue-600 shadow ${cornerPos[c]}`}
          />
        ))}
      </div>
    </div>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}
