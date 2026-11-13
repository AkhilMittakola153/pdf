// Shared file helpers: type detection by content (magic bytes), validation,
// size formatting and safe filenames. Used by every tool.

export type AcceptKind = "pdf" | "jpeg" | "png" | "webp";

export type FileItem = {
  id: string;
  file: File;
  previewUrl?: string; // blob: URL for image thumbnails (revoked on remove)
  detail?: string; // extra info, e.g. "3 pages" or "1920 × 1080 px"
};

const LABELS: Record<AcceptKind, string> = {
  pdf: "PDF",
  jpeg: "JPG",
  png: "PNG",
  webp: "WebP",
};

const ACCEPT_ATTR: Record<AcceptKind, string> = {
  pdf: "application/pdf,.pdf",
  jpeg: "image/jpeg,.jpg,.jpeg",
  png: "image/png,.png",
  webp: "image/webp,.webp",
};

/** Value for <input accept="...">, e.g. "image/png,.png,image/webp,.webp" */
export function acceptAttribute(kinds: AcceptKind[]): string {
  return kinds.map((k) => ACCEPT_ATTR[k]).join(",");
}

export function acceptLabels(kinds: AcceptKind[]): string {
  return kinds.map((k) => LABELS[k]).join(", ");
}

/**
 * Detect the real file type from its first bytes, not its extension.
 * A file renamed from .exe to .pdf will be rejected.
 */
export async function detectFileKind(file: File): Promise<AcceptKind | null> {
  try {
    const bytes = new Uint8Array(await file.slice(0, 1024).arrayBuffer());

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (png.every((b, i) => bytes[i] === b)) return "png";

    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";

    // WebP: "RIFF" .... "WEBP"
    const ascii = (start: number, end: number) =>
      String.fromCharCode(...Array.from(bytes.subarray(start, end)));
    if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";

    // PDF: "%PDF-" must appear within the first 1024 bytes
    if (ascii(0, bytes.length).includes("%PDF-")) return "pdf";

    return null;
  } catch {
    return null;
  }
}

export async function validateFiles(
  files: File[],
  opts: { accept: AcceptKind[]; maxSizeMB: number; maxFiles: number },
): Promise<{ valid: File[]; errors: string[] }> {
  const valid: File[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const name = displayName(file.name);

    if (valid.length >= opts.maxFiles) {
      errors.push(`File limit reached: "${name}" was skipped.`);
      continue;
    }
    if (file.size === 0) {
      errors.push(`"${name}" is empty (0 bytes).`);
      continue;
    }
    if (file.size > opts.maxSizeMB * 1024 * 1024) {
      errors.push(`"${name}" is ${formatBytes(file.size)}; the limit is ${opts.maxSizeMB} MB.`);
      continue;
    }
    const kind = await detectFileKind(file);
    if (!kind || !opts.accept.includes(kind)) {
      errors.push(`"${name}" is not a supported file. Allowed: ${acceptLabels(opts.accept)}.`);
      continue;
    }
    valid.push(file);
  }

  return { valid, errors };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}

function stripControlChars(s: string): string {
  return Array.from(s)
    .filter((c) => {
      const code = c.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("");
}

/** Filename safe to show on screen (shortened in the middle if long). */
export function displayName(name: string, max = 60): string {
  const clean = stripControlChars(name).trim() || "file";
  if (clean.length <= max) return clean;
  const half = Math.floor((max - 1) / 2);
  return `${clean.slice(0, half)}…${clean.slice(-half)}`;
}

/** "My Report.pdf" -> "My Report" */
export function baseName(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}

/** Safe name for downloaded files, e.g. safeDownloadName("photo", "pdf") -> "photo.pdf" */
export function safeDownloadName(base: string, ext: string): string {
  const clean =
    stripControlChars(base)
      .replace(/[\\/:*?"<>|]+/g, "-")
      .trim()
      .slice(0, 80) || "file";
  return `${clean}.${ext}`;
}

export function makeId(): string {
  return crypto.randomUUID();
}
