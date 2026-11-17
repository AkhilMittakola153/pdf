"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Cloud, Copy, Download, Loader2, Lock, Sparkles, TriangleAlert } from "lucide-react";
import Dropzone from "@/components/Dropzone";
import PdfFileCard from "@/components/PdfFileCard";
import Segmented, { type Option } from "@/components/Segmented";
import { useHandoff } from "@/hooks/useHandoff";
import { downloadBlob } from "@/lib/download";
import { baseName, safeDownloadName } from "@/lib/files";
import { STICKY_ACTIONS } from "@/lib/ui";
import {
  CLOUD_MAX_CHARS,
  extractPdfText,
  localStatus,
  summarizeInCloud,
  summarizeOnDevice,
  toItems,
  type LocalStatus,
  type SummaryLength,
  type SummaryType,
} from "@/lib/summarize";

const TYPES: Option<SummaryType>[] = [
  { value: "key-points", label: "Key points" },
  { value: "tldr", label: "Short summary" },
];
const LENGTHS: Option<SummaryLength>[] = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
];

type Result = { items: string[]; type: SummaryType; engine: "device" | "cloud"; truncated: boolean };

export default function SummarizePdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [doc, setDoc] = useState<{ text: string; pages: number; words: number } | null>(null);
  const [local, setLocal] = useState<LocalStatus | null>(null);
  const [type, setType] = useState<SummaryType>("key-points");
  const [length, setLength] = useState<SummaryLength>("medium");
  const [cloudOk, setCloudOk] = useState(false); // explicit consent, per document
  const [localFailed, setLocalFailed] = useState(false);

  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const generation = useRef(0);

  useEffect(() => {
    void localStatus().then(setLocal);
  }, []);

  function clearResult() {
    setResult(null);
    setError("");
    setCopied(false);
  }

  async function handleFiles(files: File[]) {
    const f = files[0];
    if (!f) return;
    const gen = ++generation.current;
    clearResult();
    setDoc(null);
    setCloudOk(false);
    setLocalFailed(false);
    setFile(f);
    setBusy(true);
    try {
      const d = await extractPdfText(f, (done, total) => setStatus(`Reading page ${Math.min(done + 1, total)} of ${total}…`));
      if (gen !== generation.current) return;
      setDoc(d);
    } catch (e) {
      if (gen !== generation.current) return;
      setError(e instanceof Error ? e.message : "This PDF could not be read.");
      setFile(null);
    } finally {
      if (gen === generation.current) {
        setBusy(false);
        setStatus("");
      }
    }
  }

  // A PDF sent from the homepage or another tool
  useHandoff((files) => void handleFiles(files));

  function reset() {
    generation.current++;
    clearResult();
    setFile(null);
    setDoc(null);
    setCloudOk(false);
    setLocalFailed(false);
  }

  const tooLittle = doc !== null && doc.words < 40;
  const canDevice = (local === "available" || local === "downloadable" || local === "downloading") && !localFailed;
  const cloudChars = doc ? Math.min(doc.text.length, CLOUD_MAX_CHARS) : 0;

  async function runDevice() {
    if (!doc) return;
    clearResult();
    setBusy(true);
    try {
      // Started directly from the click: the browser requires this to start its AI model
      const r = await summarizeOnDevice(doc.text, type, length, setStatus);
      setResult({ items: toItems(r.summary, type), type, engine: "device", truncated: r.truncated });
    } catch {
      setLocalFailed(true);
      setError("On-device summarising didn't work in this browser. You can try the cloud option below.");
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  async function runCloud() {
    if (!doc || !cloudOk) return;
    clearResult();
    setBusy(true);
    setStatus("Summarising with cloud AI…");
    try {
      const r = await summarizeInCloud(doc.text, type, length);
      setResult({ items: toItems(r.summary, type), type, engine: "cloud", truncated: r.truncated });
    } catch (e) {
      setError(e instanceof Error ? e.message : "The AI service could not create a summary.");
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  const summaryText = result ? (result.type === "key-points" ? result.items.map((i) => `• ${i}`).join("\n") : result.items[0]) : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy automatically. Select the text and copy it instead.");
    }
  }

  return (
    <div className="space-y-6">
      {!file && <Dropzone accept={["pdf"]} multiple={false} maxSizeMB={100} onFiles={(f) => void handleFiles(f)} title="Drop a PDF here" />}

      {file && doc && (
        <>
          <PdfFileCard file={file} pageCount={doc.pages} onReset={reset} disabled={busy} />

          {tooLittle ? (
            <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              This PDF has little or no selectable text. It is probably a scan or a set of images, and summaries need
              text. If you can copy text from it in a PDF reader, try again; otherwise it can&apos;t be summarised yet.
            </p>
          ) : (
            <section aria-labelledby="sum-heading" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
              <div>
                <h2 id="sum-heading" className="text-lg font-semibold text-slate-900">
                  Summary options
                </h2>
                <p className="mt-1 text-sm text-slate-500">About {doc.words.toLocaleString("en-IN")} words found.</p>
              </div>

              <div className="flex flex-wrap gap-5">
                <Segmented legend="Type" name="sum-type" options={TYPES} value={type} onChange={(v) => { clearResult(); setType(v); }} />
                <Segmented legend="Length" name="sum-length" options={LENGTHS} value={length} onChange={(v) => { clearResult(); setLength(v); }} />
              </div>

              {local === null ? (
                <p className="flex items-center gap-2 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Checking your browser…
                </p>
              ) : canDevice ? (
                <div className="space-y-3">
                  <p className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
                    <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      Your browser can summarise <strong>on this device</strong>. Nothing is uploaded.
                      {local !== "available" && " The first time, it downloads its AI model (a one-time download)."}
                    </span>
                  </p>
                  <div className={STICKY_ACTIONS}>
                    <button
                      type="button"
                      onClick={runDevice}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                      Summarise on this device
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-700">
                    {localFailed ? "On-device AI didn't work here." : "This browser can't summarise on your device."} On-device
                    summaries need Chrome or Edge on a computer with enough memory.
                  </p>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <p className="flex items-center gap-2 font-semibold">
                      <Cloud className="h-4 w-4" aria-hidden="true" /> Optional: use cloud AI
                    </p>
                    <p className="mt-1">
                      The text of this PDF{doc.text.length > CLOUD_MAX_CHARS ? ` (first ${cloudChars.toLocaleString("en-IN")} characters)` : ""} will
                      be sent to Cloudflare Workers AI to create the summary. The PDF file itself is not sent, and we don&apos;t store
                      anything. <strong>Don&apos;t use this for confidential documents.</strong>
                    </p>
                    <label className="mt-3 flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={cloudOk}
                        onChange={(e) => setCloudOk(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-blue-600"
                      />
                      <span>I understand. Send this document&apos;s text to cloud AI.</span>
                    </label>
                  </div>
                  <div className={STICKY_ACTIONS}>
                    <button
                      type="button"
                      onClick={runCloud}
                      disabled={!cloudOk || busy}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Cloud className="h-4 w-4" aria-hidden="true" />}
                      Summarise with cloud AI
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
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

      {result && file && (
        <section aria-labelledby="sum-result" className="space-y-4 rounded-2xl border border-green-200 bg-green-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="sum-result" className="text-lg font-semibold text-slate-900">
              {result.type === "key-points" ? "Key points" : "Summary"}
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
              {result.engine === "device" ? <Lock className="h-3.5 w-3.5" aria-hidden="true" /> : <Cloud className="h-3.5 w-3.5" aria-hidden="true" />}
              {result.engine === "device" ? "Made on your device" : "Made with cloud AI"}
            </span>
          </div>
          {result.type === "key-points" ? (
            <ul className="list-disc space-y-2 pl-5 text-slate-800">
              {result.items.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-800">{result.items[0]}</p>
          )}
          {result.truncated && <p className="text-xs text-slate-600">This document is long, so only the first part was summarised.</p>}
          <p className="flex items-start gap-1.5 text-xs text-slate-600">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            AI summaries can miss details or make mistakes. Check important facts in the original.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {copied ? <Check className="h-4 w-4 text-green-600" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={() => downloadBlob(new Blob([summaryText], { type: "text/plain" }), safeDownloadName(`${baseName(file.name)}-summary`, "txt"))}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download .txt
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
