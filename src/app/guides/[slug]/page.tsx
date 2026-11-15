import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Lightbulb } from "lucide-react";
import { formatDate, getGuide, GUIDES, type Block } from "@/lib/guides";
import { jsonLd, pageMeta } from "@/lib/seo";
import { SITE } from "@/lib/site";

// Build one static page per guide at build time (required for static export)
export const dynamicParams = false;
export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = getGuide((await params).slug);
  if (!guide) return {};
  return pageMeta({ title: guide.title, description: guide.description, path: `/guides/${guide.slug}` });
}

function renderBlock(block: Block, i: number) {
  switch (block.type) {
    case "h2":
      return (
        <h2 key={i} className="mt-10 text-xl font-bold text-slate-900">
          {block.text}
        </h2>
      );
    case "p":
      return (
        <p key={i} className="mt-4">
          {block.text}
        </p>
      );
    case "steps":
      return (
        <ol key={i} className="mt-4 list-decimal space-y-2 pl-6">
          {block.items.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
      );
    case "list":
      return (
        <ul key={i} className="mt-4 list-disc space-y-2 pl-6">
          {block.items.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      );
    case "tip":
      return (
        <p key={i} className="mt-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <span>{block.text}</span>
        </p>
      );
  }
}

export default async function GuidePage({ params }: Props) {
  const guide = getGuide((await params).slug);
  if (!guide) return notFound();

  const url = `${SITE.url}/guides/${guide.slug}`;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.title,
      description: guide.description,
      datePublished: guide.published,
      author: { "@type": "Organization", name: SITE.name, url: SITE.url },
      publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
      mainEntityOfPage: url,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
        { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE.url}/guides` },
        { "@type": "ListItem", position: 3, name: guide.title, item: url },
      ],
    },
  ];

  const others = GUIDES.filter((g) => g.slug !== guide.slug).slice(0, 3);

  const cta = (
    <Link
      href={guide.tool}
      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      Open {guide.toolName} <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />

      <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
        <Link href="/" className="hover:text-blue-700">
          Home
        </Link>{" "}
        /{" "}
        <Link href="/guides" className="hover:text-blue-700">
          Guides
        </Link>
      </nav>

      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{guide.title}</h1>
      <p className="mt-2 text-sm text-slate-500">
        {formatDate(guide.published)} · {guide.readMinutes} min read
      </p>

      <div className="mt-6">{cta}</div>

      <div className="mt-6 leading-relaxed text-slate-700">{guide.body.map(renderBlock)}</div>

      <div className="mt-10 rounded-2xl border border-blue-200 bg-blue-50 p-6">
        <p className="font-semibold text-slate-900">Ready to try it?</p>
        <p className="mt-1 text-sm text-slate-600">Free, no sign-up, and your files never leave your device.</p>
        <div className="mt-4">{cta}</div>
      </div>

      {others.length > 0 && (
        <section className="mt-12" aria-labelledby="more-guides">
          <h2 id="more-guides" className="text-lg font-bold text-slate-900">
            More guides
          </h2>
          <ul className="mt-3 space-y-2">
            {others.map((g) => (
              <li key={g.slug}>
                <Link href={`/guides/${g.slug}`} className="font-medium text-blue-700 hover:underline">
                  {g.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
