// Shows the opened PDF (name, pages, size) with a "Choose another PDF" button.
import { FileText, RotateCcw } from "lucide-react";
import { displayName, formatBytes } from "@/lib/files";

export default function PdfFileCard({
  file,
  pageCount,
  onReset,
  disabled = false,
}: {
  file: File;
  pageCount: number;
  onReset: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-100">
        <FileText className="h-6 w-6 text-slate-500" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-900">{displayName(file.name)}</p>
        <p className="text-sm text-slate-500">
          {pageCount} page{pageCount === 1 ? "" : "s"} · {formatBytes(file.size)}
        </p>
      </div>
      <button
        type="button"
        onClick={onReset}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Choose another PDF
      </button>
    </div>
  );
}
