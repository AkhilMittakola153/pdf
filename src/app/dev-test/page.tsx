"use client";

// TEMPORARY test page for the shared components. Delete this folder before launch.
import Dropzone from "@/components/Dropzone";
import FileList from "@/components/FileList";
import { useFileItems } from "@/hooks/useFileItems";

export default function DevTestPage() {
  const { items, add, remove, move, clear } = useFileItems({ preview: true });

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-bold">Component test (delete before launch)</h1>
      <Dropzone accept={["jpeg", "png", "webp", "pdf"]} currentCount={items.length} maxFiles={10} onFiles={add} />
      <FileList items={items} onMove={move} onRemove={remove} />
      {items.length > 0 && (
        <button type="button" onClick={clear} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100">
          Clear all
        </button>
      )}
    </div>
  );
}
