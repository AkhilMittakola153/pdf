// Download helpers shared by all tools.

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser time to start the download before freeing memory
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function uniqueName(name: string, used: Set<string>): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let candidate = name;
  let i = 1;
  while (used.has(candidate.toLowerCase())) candidate = `${base} (${i++})${ext}`;
  used.add(candidate.toLowerCase());
  return candidate;
}

/** Bundle several files into one ZIP. JSZip is loaded only when needed. */
export async function downloadZip(files: { name: string; blob: Blob }[], zipName: string) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const used = new Set<string>();
  for (const f of files) zip.file(uniqueName(f.name, used), f.blob);
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, zipName);
}
