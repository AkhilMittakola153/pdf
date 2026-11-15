"use client";

// Large upload area: drag-and-drop or "Choose files" button.
// Validates files by real content before passing them on.
import { useId, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { CircleAlert, Lock, Upload } from "lucide-react";
import { acceptAttribute, acceptLabels, validateFiles, type AcceptKind } from "@/lib/files";

type DropzoneProps = {
  accept: AcceptKind[];
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  maxFiles?: number; // total files allowed in the tool
  currentCount?: number; // files already added
  maxSizeMB?: number; // per file
  title?: string;
  hint?: string;
};

export default function Dropzone({
  accept,
  onFiles,
  multiple = true,
  maxFiles = 20,
  currentCount = 0,
  maxSizeMB = 50,
  title,
  hint,
}: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [dragging, setDragging] = useState(false);
  const [checking, setChecking] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const remaining = multiple ? Math.max(0, maxFiles - currentCount) : 1;
  const heading = title ?? (multiple ? "Drop files here" : "Drop a file here");
  const hintText = hint ?? `${acceptLabels(accept)} · up to ${maxSizeMB} MB each`;

  async function handle(files: File[]) {
    if (files.length === 0) return;
    setChecking(true);
    const result = await validateFiles(files, { accept, maxSizeMB, maxFiles: remaining });
    setErrors(result.errors);
    setChecking(false);
    if (result.valid.length > 0) onFiles(result.valid);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    void handle(Array.from(e.dataTransfer.files));
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!dragging) setDragging(true);
  }

  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setDragging(false);
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allows choosing the same file again
    void handle(files);
  }

  return (
    <div className="space-y-3">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragging ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-white"
        }`}
      >
        <Upload className="h-10 w-10 text-blue-600" aria-hidden="true" />
        <p className="text-lg font-semibold text-slate-800">{heading}</p>
        <p id={hintId} className="text-sm text-slate-500">
          {hintText}
        </p>
        <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          Files stay on your device. Nothing is uploaded.
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={checking || remaining === 0}
          aria-describedby={hintId}
          className="mt-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {checking ? "Checking files…" : multiple ? "Choose files" : "Choose file"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={acceptAttribute(accept)}
          multiple={multiple}
          onChange={onChange}
          className="hidden"
          tabIndex={-1}
        />
      </div>

      {/* Screen readers announce errors as soon as they appear */}
      <div role="alert" aria-live="assertive">
        {errors.length > 0 && (
          <ul className="space-y-1 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errors.map((err, i) => (
              <li key={i} className="flex items-start gap-2">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{err}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
