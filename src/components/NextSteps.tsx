"use client";

// "Continue with this file" buttons shown under a result.
// Sends the result straight into another tool (no upload, no re-download).
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { handOffFiles } from "@/lib/handoff";
import { GROUP_COLOR, TOOLS, type ToolGroup } from "@/lib/tools";

export default function NextSteps({
  files,
  kind,
  current,
}: {
  files: File[];
  kind: ToolGroup; // what the result files are
  current: string; // href of this tool, hidden from the list
}) {
  const router = useRouter();
  const options = TOOLS.filter((t) => t.accepts === kind && t.href !== current);
  if (files.length === 0 || options.length === 0) return null;

  return (
    <div className="border-t border-slate-200 pt-4">
      <p className="text-sm font-medium text-slate-700">
        Continue with {files.length === 1 ? "this file" : "these files"}:
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((t) => {
          const Icon = t.icon;
          const firstOnly = !t.multiple && files.length > 1;
          return (
            <button
              key={t.href}
              type="button"
              onClick={() => {
                handOffFiles(firstOnly ? files.slice(0, 1) : files);
                router.push(t.href);
              }}
              className="group inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-blue-400 hover:bg-blue-50"
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded ${GROUP_COLOR[t.group].tile}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              {t.name}
              {firstOnly && <span className="text-xs text-slate-500">(first file)</span>}
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
