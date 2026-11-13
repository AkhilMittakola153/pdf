"use client";

// Shows uploaded files with thumbnail, name, size, and buttons to
// move up/down and remove. Order here = order used when processing.
import { ArrowDown, ArrowUp, FileText, Trash2 } from "lucide-react";
import { displayName, formatBytes, type FileItem } from "@/lib/files";

type FileListProps = {
  items: FileItem[];
  onMove?: (id: string, dir: -1 | 1) => void;
  onRemove: (id: string) => void;
};

const iconBtn =
  "rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-30 disabled:hover:bg-transparent";

export default function FileList({ items, onMove, onRemove }: FileListProps) {
  if (items.length === 0) return null;

  return (
    <ol className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
      {items.map((item, index) => {
        const name = displayName(item.file.name);
        return (
          <li key={item.id} className="flex items-center gap-3 p-3">
            <span className="w-6 text-center text-sm font-medium text-slate-400">{index + 1}</span>

            {item.previewUrl ? (
              // Blob URLs cannot use next/image, so a plain <img> is correct here.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.previewUrl}
                alt=""
                className="h-12 w-12 shrink-0 rounded-md border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-slate-100">
                <FileText className="h-6 w-6 text-slate-500" aria-hidden="true" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800" title={name}>
                {name}
              </p>
              <p className="text-xs text-slate-500">
                {formatBytes(item.file.size)}
                {item.detail ? ` · ${item.detail}` : ""}
              </p>
            </div>

            {onMove && (
              <>
                <button
                  type="button"
                  className={iconBtn}
                  onClick={() => onMove(item.id, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${name} up`}
                >
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={iconBtn}
                  onClick={() => onMove(item.id, 1)}
                  disabled={index === items.length - 1}
                  aria-label={`Move ${name} down`}
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </button>
              </>
            )}
            <button
              type="button"
              className={`${iconBtn} hover:text-red-600`}
              onClick={() => onRemove(item.id)}
              aria-label={`Remove ${name}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ol>
  );
}
