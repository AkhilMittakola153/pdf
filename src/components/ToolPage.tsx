// Shared layout for every tool page: heading, intro, the tool itself,
// then "How to" steps and FAQs (useful for visitors and for SEO).
import type { ReactNode } from "react";

type ToolPageProps = {
  title: string;
  intro: string;
  steps: string[];
  faqs: { q: string; a: string }[];
  children: ReactNode;
};

export default function ToolPage({ title, intro, steps, faqs, children }: ToolPageProps) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">{intro}</p>
      </header>

      <div className="mt-8">{children}</div>

      <section className="mt-14" aria-labelledby="howto-heading">
        <h2 id="howto-heading" className="text-xl font-bold text-slate-900">
          How to use
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-6 text-slate-700">
          {steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>

      <section className="mt-10" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-xl font-bold text-slate-900">
          Frequently asked questions
        </h2>
        <div className="mt-4 space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="rounded-xl border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer font-medium text-slate-900">{f.q}</summary>
              <p className="mt-2 text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
