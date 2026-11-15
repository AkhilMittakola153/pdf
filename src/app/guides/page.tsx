import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { GUIDES } from "@/lib/guides";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Guides – PDF and Image How-Tos",
  description:
    "Short, practical guides: compress a PDF for email, merge PDFs on your phone, turn photos into a PDF, extract pages and more.",
  path: "/guides",
});

export default function GuidesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <header className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Guides</h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">
          Short, practical how-tos for everyday PDF and image tasks.
        </p>
      </header>

      <ul className="mt-10 grid gap-5 sm:grid-cols-2">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/guides/${g.slug}`}
              className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                {g.readMinutes} min read · {g.toolName}
              </span>
              <h2 className="mt-3 text-lg font-semibold text-slate-900">{g.title}</h2>
              <p className="mt-2 flex-1 text-sm text-slate-600">{g.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-700">
                Read guide <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
