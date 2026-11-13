import { ShieldCheck, Smartphone, Zap } from "lucide-react";
import ToolCard from "@/components/ToolCard";
import { TOOLS } from "@/lib/tools";

const FEATURES = [
  { icon: ShieldCheck, title: "Private by design", text: "Files are processed on your device and never uploaded to a server." },
  { icon: Zap, title: "Fast and free", text: "No sign-up, no watermarks, no waiting in a queue." },
  { icon: Smartphone, title: "Works everywhere", text: "Use it on your phone, tablet or computer, in any modern browser." },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="py-14 text-center sm:py-20">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Convert, Merge &amp; Resize PDFs and Images
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Free, fast and secure. Your files stay on your device. No sign-up required.
        </p>
      </section>

      <section aria-labelledby="tools-heading">
        <h2 id="tools-heading" className="sr-only">
          All tools
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <ToolCard key={tool.href} tool={tool} />
          ))}
        </div>
      </section>

      <section className="mt-16 grid gap-6 sm:grid-cols-3" aria-label="Why PDFConvertly">
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
