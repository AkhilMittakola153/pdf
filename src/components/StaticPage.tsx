// Shared layout for text pages (About, Contact, Privacy, Terms).
// The [&_h2]: style rules format headings, paragraphs and lists inside.
import type { ReactNode } from "react";

export default function StaticPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
      {updated && <p className="mt-2 text-sm text-slate-500">Last updated: {updated}</p>}
      <div className="mt-8 space-y-4 leading-relaxed text-slate-700 [&_a]:font-medium [&_a]:text-blue-700 [&_a]:underline [&_a:hover]:text-blue-900 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_li]:mt-1 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
        {children}
      </div>
    </article>
  );
}
