"use client";

// Shared editor for Edit PDF and Sign PDF.
// Pages are shown as images; everything the user adds sits in a layer on top
// and is only written into the PDF when they press Save.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  CalendarDays,
  Download,
  Eraser,
  ExternalLink,
  Highlighter,
  ImagePlus,
  Loader2,
  MousePointer2,
  PenLine,
  PenTool,
  Trash2,
  TriangleAlert,
  Type,
  Undo2,
} from "lucide-react";
import Dropzone from "@/components/Dropzone";
import NextSteps from "@/components/NextSteps";
import PdfFileCard from "@/components/PdfFileCard";
import SignatureDialog, { type Signature } from "@/components/editor/SignatureDialog";
import { useHandoff } from "@/hooks/useHandoff";
import { usePdfEditorPages } from "@/hooks/usePdfEditorPages";
import { downloadBlob } from "@/lib/download";
import { baseName, formatBytes, makeId, safeDownloadName } from "@/lib/files";
import { blobToFile } from "@/lib/handoff";
import { HIGHLIGHT, LINE_HEIGHT, savePdfWithEdits, type Annot, type ImageAnnot, type PageInfo } from "@/lib/pdfEdit";
import { STICKY_ACTIONS } from "@/lib/ui";

type Tool = "select" | "text" | "date" | "whiteout" | "highlight" | "draw" | "image" | "sign";
type Pending = { src: string; mime: "image/png" | "image/jpeg"; aspect: number; width: number }; // image waiting to be placed

const TOOL_INFO: Record<Tool, { label: string; icon: typeof Type; hint: string }> = {
  select: { label: "Select", icon: MousePointer2, hint: "Tap an item to select it. Drag to move, use the corner to resize." },
  text: { label: "Text", icon: Type, hint: "Tap where you want to type." },
  date: { label: "Date", icon: CalendarDays, hint: "Tap where you want today's date." },
  whiteout: { label: "White-out", icon: Eraser, hint: "Drag over text to cover it with white." },
  highlight: { label: "Highlight", icon: Highlighter, hint: "Drag over text to highlight it." },
  draw: { label: "Draw", icon: PenLine, hint: "Draw freely with your mouse or finger." },
  image: { label: "Image", icon: ImagePlus, hint: "Choose an image, then tap where to place it." },
  sign: { label: "Sign", icon: PenTool, hint: "Create your signature, then tap where to place it." },
};

const TOOLS_FOR: Record<"edit" | "sign", Tool[]> = {
  edit: ["select", "text", "whiteout", "highlight", "draw", "image", "sign"],
  sign: ["select", "sign", "text", "date"],
};

const COLORS = ["#111827", "#1d4ed8", "#dc2626"];
const SIZES = [10, 12, 14, 18, 24, 32];

type Gesture =
  | { type: "rect"; page: number; x0: number; y0: number }
  | { type: "ink"; page: number; points: [number, number][] }
  | { type: "move"; id: string; px: number; py: number; ox: number; oy: number; before: Annot[]; moved: boolean }
  | { type: "resize"; id: string; px: number; py: number; ow: number; oh: number; aspect: number; before: Annot[] };

const pct = (v: number, total: number) => `${(v / total) * 100}%`;

export default function PdfEditor({ mode }: { mode: "edit" | "sign" }) {
  const pdf = usePdfEditorPages();
  const [annots, setAnnots] = useState<Annot[]>([]);
  const [history, setHistory] = useState<Annot[][]>([]);
  const [tool, setTool] = useState<Tool>(mode === "sign" ? "sign" : "select");
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [size, setSize] = useState(14);
  const [color, setColor] = useState(COLORS[0]);
  const [inkWidth, setInkWidth] = useState(2);
  const [pending, setPending] = useState<Pending | null>(null);
  const [signature, setSignature] = useState<Signature | null>(null);
  const [sigOpen, setSigOpen] = useState(false);
  const [draft, setDraft] = useState<Annot | null>(null);

  const [result, setResult] = useState<{ blob: Blob; url: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const gesture = useRef<Gesture | null>(null);
  const layerRect = useRef<{ rect: DOMRect; info: PageInfo } | null>(null);
  const resultUrl = useRef<string | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);

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
    setError("");
  }

  /** Change the list of edits, remembering the old one for Undo. */
  function commit(next: Annot[], before: Annot[] = annots) {
    clearResult();
    setHistory((h) => [...h.slice(-49), before]);
    setAnnots(next);
  }

  function undo() {
    const prev = history[history.length - 1];
    if (!prev) return;
    clearResult();
    setHistory((h) => h.slice(0, -1));
    setAnnots(prev);
    setSelected(null);
    setEditing(null);
  }

  function removeSelected() {
    if (!selected) return;
    commit(annots.filter((a) => a.id !== selected));
    setSelected(null);
    setEditing(null);
  }

  function handleFiles(files: File[]) {
    if (!files[0]) return;
    clearResult();
    setAnnots([]);
    setHistory([]);
    setSelected(null);
    setEditing(null);
    setPending(null);
    void pdf.open(files[0]);
    if (mode === "sign" && !signature) setSigOpen(true);
  }

  // A PDF sent from the homepage or another tool
  useHandoff(handleFiles);

  function reset() {
    clearResult();
    setAnnots([]);
    setHistory([]);
    setSelected(null);
    setEditing(null);
    setPending(null);
    pdf.reset();
  }

  function chooseTool(t: Tool) {
    setEditing(null);
    setSelected(null);
    setPending(null);
    setTool(t);
    if (t === "sign") {
      if (signature) setPending({ ...signature, width: 160 });
      else setSigOpen(true);
    }
    if (t === "image") imageInput.current?.click();
  }

  function onImagePicked(f: File | undefined) {
    if (!f) return;
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
      const png = f.type === "image/png" || f.type === "image/webp";
      setPending({
        src: c.toDataURL(png ? "image/png" : "image/jpeg", 0.9),
        mime: png ? "image/png" : "image/jpeg",
        aspect: c.width / c.height,
        width: 200,
      });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      setError("That image could not be opened. Try a JPG or PNG.");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  // Keyboard: Delete removes, Ctrl+Z undoes, Escape cancels
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT");
      if (typing) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        e.preventDefault();
        removeSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      } else if (e.key === "Escape") {
        setSelected(null);
        setPending(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  // ---- Pointer helpers (screen pixels → PDF points) ----
  function toPt(e: { clientX: number; clientY: number }) {
    const l = layerRect.current;
    if (!l) return { x: 0, y: 0 };
    return {
      x: ((e.clientX - l.rect.left) / l.rect.width) * l.info.width,
      y: ((e.clientY - l.rect.top) / l.rect.height) * l.info.height,
    };
  }

  function onLayerDown(e: ReactPointerEvent<HTMLDivElement>, page: number, info: PageInfo) {
    layerRect.current = { rect: e.currentTarget.getBoundingClientRect(), info };
    const { x, y } = toPt(e);
    // Stop the browser's own mouse handling (text selection, focus changes).
    // Without this, a new text box loses focus straight away and disappears.
    if (pending || tool !== "select") e.preventDefault();

    if (pending) {
      const w = Math.min(pending.width, info.width * 0.8);
      const h = w / pending.aspect;
      const a: ImageAnnot = { id: makeId(), page, kind: "image", x: x - w / 2, y: y - h / 2, w, h, src: pending.src, mime: pending.mime };
      commit([...annots, a]);
      setPending(null);
      setTool("select");
      setSelected(a.id);
      return;
    }
    if (tool === "text" || tool === "date") {
      const text = tool === "date" ? new Date().toLocaleDateString("en-GB") : "";
      const a: Annot = { id: makeId(), page, kind: "text", x, y: y - size * 0.6, text, size, color };
      commit([...annots, a]);
      setSelected(a.id);
      setEditing(tool === "text" ? a.id : null);
      setTool("select");
      return;
    }
    if (tool === "whiteout" || tool === "highlight") {
      e.currentTarget.setPointerCapture(e.pointerId);
      gesture.current = { type: "rect", page, x0: x, y0: y };
      setDraft({ id: "draft", page, kind: "rect", x, y, w: 0, h: 0, style: tool });
      return;
    }
    if (tool === "draw") {
      e.currentTarget.setPointerCapture(e.pointerId);
      gesture.current = { type: "ink", page, points: [[x, y]] };
      setDraft({ id: "draft", page, kind: "ink", x: 0, y: 0, w: info.width, h: info.height, points: [[x, y]], color, width: inkWidth });
      return;
    }
    // Select tool on empty space: deselect
    setSelected(null);
    setEditing(null);
  }

  function onLayerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g) return;
    const { x, y } = toPt(e);
    if (g.type === "rect") {
      setDraft((d) =>
        d && d.kind === "rect" ? { ...d, x: Math.min(g.x0, x), y: Math.min(g.y0, y), w: Math.abs(x - g.x0), h: Math.abs(y - g.y0) } : d,
      );
    } else if (g.type === "ink") {
      g.points.push([x, y]);
      setDraft((d) => (d && d.kind === "ink" ? { ...d, points: [...g.points] } : d));
    }
  }

  function onLayerUp() {
    const g = gesture.current;
    gesture.current = null;
    const d = draft;
    setDraft(null);
    if (!g || !d) return;
    if (g.type === "rect" && d.kind === "rect" && d.w > 3 && d.h > 3) {
      commit([...annots, { ...d, id: makeId() }]);
    } else if (g.type === "ink" && d.kind === "ink" && g.points.length > 0) {
      const pad = inkWidth;
      const xs = g.points.map((p) => p[0]);
      const ys = g.points.map((p) => p[1]);
      const x = Math.min(...xs) - pad;
      const y = Math.min(...ys) - pad;
      commit([
        ...annots,
        {
          id: makeId(),
          page: g.page,
          kind: "ink",
          x,
          y,
          w: Math.max(...xs) + pad - x,
          h: Math.max(...ys) + pad - y,
          points: g.points.map(([px, py]) => [px - x, py - y] as [number, number]),
          color,
          width: inkWidth,
        },
      ]);
    }
  }

  // ---- Moving and resizing items ----
  function onItemDown(e: ReactPointerEvent<HTMLElement>, a: Annot, info: PageInfo) {
    if (tool !== "select" || pending) return; // let the page layer handle drawing tools
    e.stopPropagation();
    if (editing === a.id) return; // typing: don't drag
    const layer = e.currentTarget.closest("[data-layer]") as HTMLElement | null;
    if (!layer) return;
    layerRect.current = { rect: layer.getBoundingClientRect(), info };
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = toPt(e);
    setSelected(a.id);
    if (editing && editing !== a.id) setEditing(null);
    gesture.current = { type: "move", id: a.id, px: x, py: y, ox: a.x, oy: a.y, before: annots, moved: false };
  }

  function onHandleDown(e: ReactPointerEvent<HTMLElement>, a: Annot, info: PageInfo) {
    if (a.kind === "text") return;
    e.stopPropagation();
    const layer = e.currentTarget.closest("[data-layer]") as HTMLElement | null;
    if (!layer) return;
    layerRect.current = { rect: layer.getBoundingClientRect(), info };
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = toPt(e);
    gesture.current = { type: "resize", id: a.id, px: x, py: y, ow: a.w, oh: a.h, aspect: a.w / a.h, before: annots };
  }

  function onItemMove(e: ReactPointerEvent<HTMLElement>) {
    const g = gesture.current;
    if (!g || (g.type !== "move" && g.type !== "resize")) return;
    const { x, y } = toPt(e);
    const dx = x - g.px;
    const dy = y - g.py;
    if (g.type === "move") {
      if (Math.abs(dx) + Math.abs(dy) > 0.5) g.moved = true;
      setAnnots((list) => list.map((a) => (a.id === g.id ? { ...a, x: g.ox + dx, y: g.oy + dy } : a)));
    } else {
      setAnnots((list) =>
        list.map((a) => {
          if (a.id !== g.id || a.kind === "text") return a;
          const w = Math.max(12, g.ow + dx);
          const keepShape = a.kind === "image" || a.kind === "ink";
          const h = keepShape ? w / g.aspect : Math.max(4, g.oh + dy);
          if (a.kind === "ink") {
            const sx = w / a.w;
            const sy = h / a.h;
            return { ...a, w, h, points: a.points.map(([px, py]) => [px * sx, py * sy] as [number, number]) };
          }
          return { ...a, w, h };
        }),
      );
    }
  }

  function onItemUp() {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    if (g.type === "move" && g.moved) {
      clearResult();
      setHistory((h) => [...h.slice(-49), g.before]);
    } else if (g.type === "resize") {
      clearResult();
      setHistory((h) => [...h.slice(-49), g.before]);
    }
  }

  function updateText(id: string, patch: Partial<{ text: string; size: number; color: string }>) {
    clearResult();
    setAnnots((list) => list.map((a) => (a.id === id && a.kind === "text" ? { ...a, ...patch } : a)));
  }

  function finishEditing(id: string) {
    setEditing(null);
    const a = annots.find((x) => x.id === id);
    if (a && a.kind === "text" && !a.text.trim()) {
      setAnnots((list) => list.filter((x) => x.id !== id));
      setSelected(null);
    }
  }

  async function save() {
    if (!pdf.file) return;
    clearResult();
    setEditing(null);
    setSaving(true);
    try {
      const blob = await savePdfWithEdits(pdf.file, annots, pdf.infos);
      const url = URL.createObjectURL(blob);
      resultUrl.current = url;
      setResult({ blob, url, name: safeDownloadName(`${baseName(pdf.file.name)}-${mode === "sign" ? "signed" : "edited"}`, "pdf") });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong while saving.");
    } finally {
      setSaving(false);
    }
  }

  // ---- Rendering ----
  const selectedAnnot = annots.find((a) => a.id === selected) ?? null;
  const showTextOptions = tool === "text" || tool === "date" || selectedAnnot?.kind === "text";
  const showInkOptions = tool === "draw";
  const hint = pending ? "Tap on a page to place it." : TOOL_INFO[tool].hint;
  const drawingTool = tool === "draw" || tool === "whiteout" || tool === "highlight";

  function renderAnnot(a: Annot, info: PageInfo, isDraft = false) {
    const isSel = !isDraft && selected === a.id;
    const box = { left: pct(a.x, info.width), top: pct(a.y, info.height) };
    const common = {
      onPointerDown: isDraft ? undefined : (e: ReactPointerEvent<HTMLElement>) => onItemDown(e, a, info),
      onPointerMove: isDraft ? undefined : onItemMove,
      onPointerUp: isDraft ? undefined : onItemUp,
    };
    const ring = isSel ? "outline-2 outline-dashed outline-blue-500 outline-offset-2" : "";
    const handle =
      isSel && a.kind !== "text" ? (
        <span
          onPointerDown={(e) => onHandleDown(e, a, info)}
          onPointerMove={onItemMove}
          onPointerUp={onItemUp}
          aria-hidden="true"
          className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize touch-none rounded-full border-2 border-white bg-blue-600 shadow"
        />
      ) : null;
    const movable = tool === "select" && !pending ? "cursor-move touch-none" : "pointer-events-none";

    if (a.kind === "text") {
      const style = {
        ...box,
        color: a.color,
        fontSize: `calc(${a.size / info.width} * 100cqw)`,
        lineHeight: LINE_HEIGHT,
        fontFamily: "Helvetica, Arial, sans-serif",
      };
      if (editing === a.id) {
        return (
          <textarea
            key={a.id}
            autoFocus
            value={a.text}
            onChange={(e) => updateText(a.id, { text: e.target.value })}
            onBlur={() => finishEditing(a.id)}
            onPointerDown={(e) => e.stopPropagation()}
            rows={Math.max(1, a.text.split("\n").length)}
            placeholder="Type here"
            aria-label="Text"
            className="absolute min-w-[6em] resize-none overflow-hidden bg-blue-50/60 p-0 outline-2 outline-blue-500 [field-sizing:content]"
            style={style}
          />
        );
      }
      return (
        <div
          key={a.id}
          {...common}
          onDoubleClick={() => tool === "select" && setEditing(a.id)}
          className={`absolute whitespace-pre ${movable} ${ring}`}
          style={style}
        >
          {a.text || " "}
        </div>
      );
    }

    const sizeStyle = { ...box, width: pct(a.w, info.width), height: pct(a.h, info.height) };

    if (a.kind === "rect") {
      const white = a.style === "whiteout";
      return (
        <div
          key={a.id}
          {...common}
          className={`absolute ${movable} ${ring} ${white && (isSel || isDraft) ? "outline outline-1 outline-slate-300" : ""}`}
          style={{
            ...sizeStyle,
            background: white ? "#fff" : `rgba(${HIGHLIGHT.r * 255}, ${HIGHLIGHT.g * 255}, ${HIGHLIGHT.b * 255}, ${HIGHLIGHT.opacity})`,
            mixBlendMode: white ? undefined : "multiply",
          }}
        >
          {handle}
        </div>
      );
    }

    if (a.kind === "image") {
      return (
        <div key={a.id} {...common} className={`absolute ${movable} ${ring}`} style={sizeStyle}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.src} alt="" draggable={false} className="h-full w-full select-none" />
          {handle}
        </div>
      );
    }

    // ink
    return (
      <div key={a.id} {...common} className={`absolute ${movable} ${ring}`} style={sizeStyle}>
        <svg viewBox={`0 0 ${a.w} ${a.h}`} preserveAspectRatio="none" className="h-full w-full overflow-visible">
          <polyline
            points={a.points.map((p) => p.join(",")).join(" ")}
            fill="none"
            stroke={a.color}
            strokeWidth={a.width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {handle}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <input
        ref={imageInput}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          onImagePicked(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {sigOpen && (
        <SignatureDialog
          onClose={() => {
            setSigOpen(false);
            if (tool === "sign" && !signature) setTool("select");
          }}
          onDone={(s) => {
            setSignature(s);
            setSigOpen(false);
            setTool("sign");
            setPending({ ...s, width: 160 });
          }}
        />
      )}

      {!pdf.file && !pdf.opening && (
        <Dropzone accept={["pdf"]} multiple={false} maxSizeMB={100} onFiles={handleFiles} title="Drop a PDF here" />
      )}

      {pdf.opening && (
        <p className="flex items-center gap-2 text-sm text-slate-700" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Opening PDF…
        </p>
      )}

      {(pdf.error || error) && (
        <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {pdf.error || error}
        </p>
      )}

      {pdf.file && (
        <>
          <PdfFileCard file={pdf.file} pageCount={pdf.infos.length} onReset={reset} disabled={saving} />

          {/* Toolbar: sticks under the header while scrolling */}
          <div className="sticky top-16 z-30 space-y-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center gap-1" role="toolbar" aria-label="Editing tools">
              {TOOLS_FOR[mode].map((t) => {
                const Icon = TOOL_INFO[t].icon;
                const on = tool === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => chooseTool(t)}
                    aria-pressed={on}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
                      on ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">{TOOL_INFO[t].label}</span>
                    <span className="sr-only sm:hidden">{TOOL_INFO[t].label}</span>
                  </button>
                );
              })}
              <span className="mx-1 h-6 w-px bg-slate-200" aria-hidden="true" />
              <button
                type="button"
                onClick={undo}
                disabled={history.length === 0}
                className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                aria-label="Undo"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={removeSelected}
                disabled={!selected}
                className="rounded-lg p-2 text-slate-700 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                aria-label="Delete selected item"
                title="Delete (Del)"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {(showTextOptions || showInkOptions || (tool === "sign" && signature)) && (
              <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-1 pt-2 text-sm text-slate-600">
                {(showTextOptions || showInkOptions) && (
                  <span className="flex items-center gap-1.5">
                    Colour
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setColor(c);
                          if (selectedAnnot?.kind === "text") updateText(selectedAnnot.id, { color: c });
                        }}
                        aria-label={`Colour ${c}`}
                        aria-pressed={color === c}
                        className={`h-6 w-6 rounded-full border-2 ${color === c ? "border-blue-500 ring-2 ring-blue-200" : "border-white"}`}
                        style={{ background: c }}
                      />
                    ))}
                  </span>
                )}
                {showTextOptions && (
                  <label className="flex items-center gap-1.5">
                    Size
                    <select
                      value={selectedAnnot?.kind === "text" ? selectedAnnot.size : size}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setSize(v);
                        if (selectedAnnot?.kind === "text") updateText(selectedAnnot.id, { size: v });
                      }}
                      className="rounded-md border border-slate-300 px-2 py-1"
                    >
                      {SIZES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {selectedAnnot?.kind === "text" && editing !== selectedAnnot.id && (
                  <button type="button" onClick={() => setEditing(selectedAnnot.id)} className="font-medium text-blue-700 hover:underline">
                    Edit text
                  </button>
                )}
                {showInkOptions && (
                  <label className="flex items-center gap-1.5">
                    Thickness
                    <select value={inkWidth} onChange={(e) => setInkWidth(Number(e.target.value))} className="rounded-md border border-slate-300 px-2 py-1">
                      <option value={1}>Thin</option>
                      <option value={2}>Medium</option>
                      <option value={4}>Thick</option>
                    </select>
                  </label>
                )}
                {tool === "sign" && signature && (
                  <button type="button" onClick={() => setSigOpen(true)} className="font-medium text-blue-700 hover:underline">
                    New signature
                  </button>
                )}
              </div>
            )}
            <p className={`px-1 text-xs ${pending ? "font-medium text-blue-700" : "text-slate-500"}`}>{hint}</p>
          </div>

          {/* Pages */}
          <div className="space-y-6">
            {pdf.infos.map((info, i) => {
              const page = i + 1;
              return (
                <figure key={page} className="mx-auto max-w-3xl">
                  <div
                    className="relative w-full overflow-hidden bg-white shadow-md ring-1 ring-slate-200"
                    style={{ aspectRatio: `${info.width} / ${info.height}`, containerType: "inline-size" }}
                  >
                    {pdf.images[page] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={pdf.images[page]} alt={`Page ${page}`} draggable={false} className="absolute inset-0 h-full w-full select-none" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Loading page {page}…
                      </div>
                    )}
                    <div
                      data-layer
                      className={`absolute inset-0 ${pending || tool !== "select" ? "cursor-crosshair" : ""}`}
                      style={{ touchAction: drawingTool ? "none" : "pan-x pan-y pinch-zoom" }}
                      onPointerDown={(e) => onLayerDown(e, page, info)}
                      onPointerMove={onLayerMove}
                      onPointerUp={onLayerUp}
                    >
                      {annots.filter((a) => a.page === page).map((a) => renderAnnot(a, info))}
                      {draft && draft.page === page && renderAnnot(draft, info, true)}
                    </div>
                  </div>
                  <figcaption className="mt-1 text-center text-xs text-slate-500">
                    Page {page} of {pdf.infos.length}
                  </figcaption>
                </figure>
              );
            })}
          </div>

          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
            {mode === "edit" && annots.some((a) => a.kind === "rect" && a.style === "whiteout") && (
              <p className="flex gap-2 text-sm text-amber-800">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                White-out hides text visually, but the original text may still be copyable. Don&apos;t use it to hide passwords or
                confidential details.
              </p>
            )}
            <div className={STICKY_ACTIONS}>
              <button
                type="button"
                onClick={save}
                disabled={annots.length === 0 || saving}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {annots.length === 0 ? (mode === "sign" ? "Place your signature first" : "Add something first") : "Save PDF"}
              </button>
            </div>
          </section>
        </>
      )}

      {result && (
        <section
          aria-label="Your PDF"
          className="flex flex-wrap items-center gap-4 rounded-2xl border border-green-200 bg-green-50 p-5"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900">{result.name}</p>
            <p className="text-sm text-slate-600">
              {pdf.infos.length} pages · {formatBytes(result.blob.size)}
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
            <NextSteps files={[blobToFile(result.blob, result.name)]} kind="pdf" current={mode === "sign" ? "/sign-pdf" : "/edit-pdf"} />
          </div>
        </section>
      )}
    </div>
  );
}
