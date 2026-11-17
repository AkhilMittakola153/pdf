// AI Summarizer helpers.
// 1. extractPdfText: reads the text of a PDF in the browser (PDF.js).
// 2. summarizeOnDevice: Chrome's built-in AI (nothing leaves the device).
// 3. summarizeInCloud: only when the user explicitly agrees; sends text to /api/summarize.
import { describePdfjsError, openPdf } from "@/lib/pdfRender";

export type SummaryType = "key-points" | "tldr";
export type SummaryLength = "short" | "medium" | "long";
export type LocalStatus = "available" | "downloadable" | "downloading" | "unavailable";

export const CLOUD_MAX_CHARS = 12000; // must match functions/api/summarize.js
const LOCAL_MAX_CHARS = 60000;
const CHUNK = 3500;

// Minimal typing for the browser's Summarizer API (Chrome 138+)
type SummarizerInstance = { summarize: (text: string, o?: { context?: string }) => Promise<string>; destroy?: () => void };
type SummarizerStatic = {
  availability: (o?: object) => Promise<string>;
  create: (o: object) => Promise<SummarizerInstance>;
};
const getApi = (): SummarizerStatic | undefined =>
  typeof self !== "undefined" ? (self as unknown as { Summarizer?: SummarizerStatic }).Summarizer : undefined;

export async function extractPdfText(
  file: File,
  onProgress: (done: number, total: number) => void,
): Promise<{ text: string; pages: number; words: number }> {
  let opened;
  try {
    opened = await openPdf(file);
  } catch (e) {
    throw new Error(describePdfjsError(e));
  }
  const { doc, close } = opened;
  try {
    const parts: string[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      onProgress(p - 1, doc.numPages);
      const content = await (await doc.getPage(p)).getTextContent();
      let line = "";
      for (const item of content.items as { str?: string; hasEOL?: boolean }[]) {
        line += item.str ?? "";
        if (item.hasEOL) line += "\n";
        else if (item.str && !item.str.endsWith(" ")) line += " ";
      }
      parts.push(line.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim());
      if (parts.join("\n\n").length > LOCAL_MAX_CHARS * 1.5) break; // enough text
    }
    onProgress(doc.numPages, doc.numPages);
    const text = parts.join("\n\n").trim();
    return { text, pages: doc.numPages, words: text ? text.split(/\s+/).length : 0 };
  } finally {
    await close();
  }
}

export async function localStatus(): Promise<LocalStatus> {
  const api = getApi();
  if (!api) return "unavailable";
  try {
    const s = await api.availability();
    return s === "available" || s === "downloadable" || s === "downloading" ? s : "unavailable";
  } catch {
    return "unavailable";
  }
}

/** Split text into pieces of about `size` characters, at paragraph or sentence breaks. */
export function chunkText(text: string, size = CHUNK): string[] {
  const chunks: string[] = [];
  let rest = text.trim();
  while (rest.length > size) {
    let cut = rest.lastIndexOf("\n\n", size);
    if (cut < size * 0.5) cut = rest.lastIndexOf(". ", size) + 1;
    if (cut < size * 0.5) cut = size;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

/**
 * Must be called straight from a click (the browser requires a user action
 * to start the model). Long documents are summarised in parts, then combined.
 */
export async function summarizeOnDevice(
  text: string,
  type: SummaryType,
  length: SummaryLength,
  onStatus: (msg: string) => void,
): Promise<{ summary: string; truncated: boolean }> {
  const api = getApi();
  if (!api) throw new Error("On-device AI is not available in this browser.");
  const monitor = (m: EventTarget) =>
    m.addEventListener("downloadprogress", (e) => {
      const loaded = (e as unknown as { loaded: number }).loaded;
      onStatus(`Downloading the browser's AI model (one time only): ${Math.round(loaded * 100)}%`);
    });

  const truncated = text.length > LOCAL_MAX_CHARS;
  const chunks = chunkText(text.slice(0, LOCAL_MAX_CHARS));
  const base = { format: "plain-text", sharedContext: "A document the user opened.", monitor };

  const final = await api.create({ ...base, type, length });
  try {
    if (chunks.length === 1) {
      onStatus("Summarising…");
      return { summary: await final.summarize(chunks[0]), truncated };
    }
    const partial = await api.create({ ...base, type: "tldr", length: "medium" });
    const notes: string[] = [];
    try {
      for (let i = 0; i < chunks.length; i++) {
        onStatus(`Reading part ${i + 1} of ${chunks.length}…`);
        notes.push(await partial.summarize(chunks[i]));
      }
    } finally {
      partial.destroy?.();
    }
    onStatus("Combining…");
    return { summary: await final.summarize(notes.join("\n\n")), truncated };
  } finally {
    final.destroy?.();
  }
}

export async function summarizeInCloud(
  text: string,
  type: SummaryType,
  length: SummaryLength,
): Promise<{ summary: string; truncated: boolean }> {
  let res: Response;
  try {
    res = await fetch("/api/summarize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, CLOUD_MAX_CHARS), type, length }),
    });
  } catch {
    throw new Error("Could not reach the AI service. Check your internet connection.");
  }
  if (res.status === 404 || res.status === 405) throw new Error("Cloud AI isn't available here (it only works on the live site).");
  const data = (await res.json().catch(() => ({}))) as { summary?: string; error?: string };
  if (!res.ok || !data.summary) throw new Error(data.error || "The AI service could not create a summary.");
  return { summary: data.summary, truncated: text.length > CLOUD_MAX_CHARS };
}

/** Turn a summary into bullet items (or one paragraph). */
export function toItems(summary: string, type: SummaryType): string[] {
  if (type === "tldr") return [summary.replace(/\s+/g, " ").trim()];
  const lines = summary
    .split(/\n+/)
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").replace(/\*\*/g, "").trim())
    .filter(Boolean);
  return lines.length ? lines : [summary.trim()];
}
