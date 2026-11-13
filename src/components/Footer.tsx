import Link from "next/link";
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
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="font-bold text-slate-900">PDFConvertly</p>
          <p className="mt-2 text-sm text-slate-600">
            Free PDF and image tools. Your files are processed in your browser and never uploaded.
          </p>
        </div>
        <nav aria-label="Tools">
          <p className="text-sm font-semibold text-slate-900">Tools</p>
          <ul className="mt-2 space-y-1">
            {TOOLS.map((t) => (
              <li key={t.href}>
                <Link href={t.href} className="text-sm text-slate-600 hover:text-blue-700">
                  {t.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Company">
          <p className="text-sm font-semibold text-slate-900">Company</p>
          <ul className="mt-2 space-y-1">
            {PAGES.map((p) => (
              <li key={p.href}>
                <Link href={p.href} className="text-sm text-slate-600 hover:text-blue-700">
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="border-t border-slate-100 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} PDFConvertly
      </p>
    </footer>
  );
}
