// Passes files from one page to another without uploading them anywhere.
// Example: drop a PDF on the homepage → choose "Merge PDF" → the Merge page
// starts with that file already added. Files live only in this tab's memory.

let pending: File[] = [];

export function handOffFiles(files: File[]) {
  pending = files;
}

export function takeHandedOffFiles(): File[] {
  const files = pending;
  pending = [];
  return files;
}

/** Turn a result (Blob) into a File so it can be passed to another tool. */
export function blobToFile(blob: Blob, name: string): File {
  return new File([blob], name, { type: blob.type });
}
