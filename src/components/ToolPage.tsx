// Shared layout for every tool page: heading, intro, the tool itself,
// then "How to" steps and FAQs. Also adds structured data (JSON-LD) so
// search engines understand the page is a free web app with FAQs.
import type { ReactNode } from "react";
import { SITE } from "@/lib/site";
import { jsonLd } from "@/lib/seo";
import ToolCard from "@/components/ToolCard";
import { TOOLS } from "@/lib/tools";

type ToolPageProps = {
  title: string;
  intro: string;
  path: string; // e.g. "/merge-pdf"
  steps: string[];
  faqs: { q: string; a: string }[];
  children: ReactNode;
};

export default function ToolPage({ title, intro, path, steps, faqs, children }: ToolPageProps) {
  // Other tools, same group (PDF or image) first
  const current = TOOLS.find((t) => t.href === path);
  const related = TOOLS.filter((t) => t.href !== path).sort(
    (a, b) => Number(b.group === current?.group) - Number(a.group === current?.group),
  );

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: `${title} – ${SITE.name}`,
      url: `${SITE.url}${path}`,
      description: intro,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any (runs in a web browser)",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
        { "@type": "ListItem", position: 2, name: title, item: `${SITE.url}${path}` },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />

      <header className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">{intro}</p>
      </header>

      <div className="mt-8">{children}</div>

      <section className="mt-14" aria-labelledby="related-heading">
        <h2 id="related-heading" className="text-xl font-bold text-slate-900">
          Related tools
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {related.map((t) => (
            <ToolCard key={t.href} tool={t} compact />
          ))}
        </div>
      </section>

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
