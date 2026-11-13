"use client";

// Manages the list of uploaded files for a tool: add, remove, reorder, clear.
// Also creates thumbnail URLs and frees them (URL.revokeObjectURL) so the
// browser does not leak memory.
import { useCallback, useEffect, useRef, useState } from "react";
import { makeId, type FileItem } from "@/lib/files";

export function useFileItems({ preview = false }: { preview?: boolean } = {}) {
  const [items, setItems] = useState<FileItem[]>([]);
  const urls = useRef<Set<string>>(new Set());

  // Free every thumbnail URL when the page is left.
  useEffect(() => {
    const set = urls.current;
    return () => {
      set.forEach((u) => URL.revokeObjectURL(u));
      set.clear();
    };
  }, []);

  const add = useCallback(
    (files: File[]) => {
      const next: FileItem[] = files.map((file) => {
        let previewUrl: string | undefined;
        if (preview && file.type.startsWith("image/")) {
          previewUrl = URL.createObjectURL(file);
          urls.current.add(previewUrl);
        }
        return { id: makeId(), file, previewUrl };
      });
      setItems((prev) => [...prev, ...next]);
      return next; // lets a tool read extra info (e.g. image size) for the new items
    },
    [preview],
  );

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
        urls.current.delete(target.previewUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const move = useCallback((id: string, dir: -1 | 1) => {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }, []);

  const update = useCallback((id: string, patch: Partial<FileItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const clear = useCallback(() => {
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current.clear();
    setItems([]);
  }, []);

  return { items, add, remove, move, update, clear };
}
