import Link from "next/link";
import { GROUP_COLOR, type Tool } from "@/lib/tools";

/** Tool card. `compact` is the smaller version used for "Related tools". */
export default function ToolCard({ tool, compact = false }: { tool: Tool; compact?: boolean }) {
  const Icon = tool.icon;
  const color = GROUP_COLOR[tool.group];

  if (compact) {
    return (
      <Link
        href={tool.href}
        className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-blue-300 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color.tile} ${color.tileHover}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block font-semibold text-slate-900">{tool.name}</span>
          <span className="block text-xs text-slate-500">{tool.short}</span>
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={tool.href}
      className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${color.tile} ${color.tileHover}`}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h3 className="text-lg font-semibold text-slate-900">{tool.name}</h3>
      <p className="text-sm text-slate-600">{tool.description}</p>
    </Link>
  );
}
