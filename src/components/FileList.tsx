"use client";

// Shows uploaded files with thumbnail, name, size, and buttons to
// move up/down and remove. On laptops rows can also be dragged to reorder.
// Order here = order used when processing.
import { useState } from "react";
import { ArrowDown, ArrowUp, FileText, GripVertical, Trash2 } from "lucide-react";
import { displayName, formatBytes, type FileItem } from "@/lib/files";

type FileListProps = {
  items: FileItem[];
  onMove?: (id: string, dir: -1 | 1) => void;
  onMoveTo?: (id: string, toIndex: number) => void; // drag-and-drop
  onRemove: (id: string) => void;
};

const iconBtn =
  "rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-30 disabled:hover:bg-transparent";

export default function FileList({ items, onMove, onMoveTo, onRemove }: FileListProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  if (items.length === 0) return null;

  const endDrag = () => {
    setDragId(null);
    setOverId(null);
  };

  return (
    <ol className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
      {items.map((item, index) => {
        const name = displayName(item.file.name);
        return (
          <li
            key={item.id}
            draggable={!!onMoveTo && items.length > 1}
            onDragStart={(e) => {
              setDragId(item.id);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", item.id);
            }}
            onDragOver={(e) => {
              if (!dragId) return; // ignore files dragged in from outside
              e.preventDefault();
              if (overId !== item.id) setOverId(item.id);
            }}
            onDrop={(e) => {
              if (!dragId || !onMoveTo) return;
              e.preventDefault();
              onMoveTo(dragId, index);
              endDrag();
            }}
            onDragEnd={endDrag}
            className={`flex items-center gap-3 p-3 transition-colors ${dragId === item.id ? "opacity-40" : ""} ${
              overId === item.id && dragId !== item.id ? "bg-blue-50" : ""
            } ${onMoveTo && items.length > 1 ? "cursor-grab active:cursor-grabbing" : ""}`}
          >
            {onMoveTo && items.length > 1 && (
              <GripVertical className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" aria-hidden="true" />
            )}
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
