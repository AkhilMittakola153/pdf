"use client";

// On page load, picks up any files handed over from another page
// (homepage drop or a "Next step" button) and passes them to the tool.
import { useEffect, useRef } from "react";
import { takeHandedOffFiles } from "@/lib/handoff";

export function useHandoff(onFiles: (files: File[]) => void) {
  const callback = useRef(onFiles);
  useEffect(() => {
    callback.current = onFiles;
  });

  useEffect(() => {
    // setTimeout: in development React runs effects twice; taking the files
    // inside the timer makes sure they are picked up exactly once.
    const t = setTimeout(() => {
      const files = takeHandedOffFiles();
      if (files.length > 0) callback.current(files);
    }, 0);
    return () => clearTimeout(t);
  }, []);
}
