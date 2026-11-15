"use client";

// Homepage: drop any PDF or image, and we suggest the right tools.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Star, X } from "lucide-react";
import Dropzone from "@/components/Dropzone";
import { detectFileKind } from "@/lib/files";
import { handOffFiles } from "@/lib/handoff";
import { GROUP_COLOR, TOOLS, type ToolGroup } from "@/lib/tools";

export default function HomeDropzone() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [kind, setKind] = useState<ToolGroup | null>(null);
  const [error, setError] = useState("");

  async function handleFiles(added: File[]) {
    setError("");
    const kinds = await Promise.all(added.map(detectFileKind));
    const isPdf = kinds.map((k) => k === "pdf");
    if (isPdf.some(Boolean) && !isPdf.every(Boolean)) {
      setError("Please add either PDFs or images, not both at once.");
      return;
    }
    setFiles(added);
    setKind(isPdf[0] ? "pdf" : "image");
  }

  function reset() {
    setFiles([]);
    setKind(null);
    setError("");
  }

  function go(href: string, multiple: boolean) {
    handOffFiles(multiple ? files : files.slice(0, 1));
    router.push(href);
  }

  if (!kind) {
    return (
      <div className="space-y-2">
        <Dropzone
          accept={["pdf", "jpeg", "png", "webp"]}
          maxFiles={50}
          maxSizeMB={100}
          onFiles={handleFiles}
          title="Drop a PDF or image to start"
          hint="We'll suggest the right tool · PDF, JPG, PNG or WebP"
        />
        {error && (
          <p role="alert" className="text-center text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }

  const options = TOOLS.filter((t) => t.accepts === kind);
  const label = kind === "pdf" ? "PDF" : "image";
  const recommended = kind === "pdf" && files.length > 1 ? "/merge-pdf" : kind === "image" ? "/image-to-pdf" : null;

  return (
    <section aria-labelledby="choose-tool" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 id="choose-tool" className="text-lg font-semibold text-slate-900">
          {files.length} {label}
          {files.length === 1 ? "" : "s"} ready. What would you like to do?
        </h2>
        <button type="button" onClick={reset} aria-label="Remove files" className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((t) => {
          const Icon = t.icon;
          const firstOnly = !t.multiple && files.length > 1;
          const isRec = t.href === recommended;
          return (
            <button
              key={t.href}
              type="button"
              onClick={() => go(t.href, t.multiple)}
              className={`group flex items-center gap-3 rounded-xl border p-3 text-left transition hover:shadow-sm ${
                isRec ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-blue-300"
              }`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${GROUP_COLOR[t.group].tile}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 font-semibold text-slate-900">
                  {t.name}
                  {isRec && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-label="Recommended" />}
                </span>
                <span className="block text-xs text-slate-500">{firstOnly ? "Uses the first file" : t.short}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
