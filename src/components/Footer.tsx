// Compact footer: brand + one row of tool links, then © and company links.
import Link from "next/link";
import { FileText } from "lucide-react";
import { SITE } from "@/lib/site";
import { TOOLS } from "@/lib/tools";

const PAGES = [
  { name: "About", href: "/about" },
  { name: "Contact", href: "/contact" },
  { name: "Privacy Policy", href: "/privacy-policy" },
  { name: "Terms", href: "/terms" },
];

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <p className="flex items-center gap-2 font-bold text-slate-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600">
              <FileText className="h-4 w-4 text-white" aria-hidden="true" />
            </span>
            {SITE.name}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Free PDF and image tools. Files are processed in your browser and never uploaded.
          </p>
        </div>
        <nav aria-label="Tools" className="md:text-right">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Tools</p>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2 md:justify-end">
            {TOOLS.map((t) => (
              <li key={t.href}>
                <Link href={t.href} className="text-sm text-slate-600 hover:text-blue-700">
                  {t.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-slate-100">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.name}
          </p>
          <nav aria-label="Company">
            <ul className="flex flex-wrap gap-x-5 gap-y-1">
              {PAGES.map((p) => (
                <li key={p.href}>
                  <Link href={p.href} className="hover:text-blue-700">
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
