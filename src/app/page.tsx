import type { Metadata } from "next";
import { ShieldCheck, Smartphone, Zap } from "lucide-react";
import HomeDropzone from "@/components/HomeDropzone";
import ToolCard from "@/components/ToolCard";
import { jsonLd, pageMeta } from "@/lib/seo";
import { SITE } from "@/lib/site";
import { GROUP_LABEL, toolsInGroup, type ToolGroup } from "@/lib/tools";

const base = pageMeta({
  title: "Convert, Merge & Resize PDFs and Images",
  description:
    "Free online tools to convert images to PDF, PDF to images, merge PDFs and resize PDFs or images. Files are processed in your browser and never uploaded.",
  path: "/",
});

// Home page uses the full title without the "| site name" suffix
export const metadata: Metadata = {
  ...base,
  title: { absolute: `${SITE.name} – Convert, Merge & Resize PDFs and Images` },
};

const websiteData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE.name,
  url: SITE.url,
};

const FEATURES = [
  { icon: ShieldCheck, title: "Private by design", text: "Files are processed on your device and never uploaded to a server." },
  { icon: Zap, title: "Fast and free", text: "No sign-up, no watermarks, no waiting in a queue." },
  { icon: Smartphone, title: "Works everywhere", text: "Use it on your phone, tablet or computer, in any modern browser." },
];

const GROUPS: ToolGroup[] = ["pdf", "image"];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(websiteData)} />

      <section className="pb-10 pt-12 text-center sm:pt-16">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Convert, Merge &amp; Resize PDFs and Images
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Free, fast and secure. Your files stay on your device. No sign-up required.
        </p>
        <div className="mx-auto mt-8 max-w-3xl text-left">
          <HomeDropzone />
        </div>
      </section>

      {GROUPS.map((g) => (
        <section key={g} aria-labelledby={`${g}-heading`} className="mt-10">
          <h2 id={`${g}-heading`} className="text-sm font-bold uppercase tracking-wider text-slate-500">
            {GROUP_LABEL[g]}
          </h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {toolsInGroup(g).map((tool) => (
              <ToolCard key={tool.href} tool={tool} />
            ))}
          </div>
        </section>
      ))}

      <section className="mt-16 grid gap-6 sm:grid-cols-3" aria-label={`Why ${SITE.name}`}>
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="text-center">
            <Icon className="mx-auto h-8 w-8 text-blue-600" aria-hidden="true" />
            <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-600">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
