// Footer: brand (with ©) + grouped columns: PDF tools, Image tools, Company.
import Link from "next/link";
import { FileText } from "lucide-react";
import { SITE } from "@/lib/site";
import { GROUP_LABEL, toolsInGroup, type ToolGroup } from "@/lib/tools";

const COMPANY = [
  { name: "Guides", href: "/guides" },
  { name: "About", href: "/about" },
  { name: "Contact", href: "/contact" },
  { name: "Privacy Policy", href: "/privacy-policy" },
  { name: "Terms", href: "/terms" },
];

const GROUPS: ToolGroup[] = ["pdf", "image"];

function Column({ title, links }: { title: string; links: { name: string; href: string }[] }) {
  return (
    <nav aria-label={title}>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-slate-600 hover:text-blue-700">
              {l.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-10 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div className="col-span-2 md:col-span-1">
          <p className="flex items-center gap-2 font-bold text-slate-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600">
              <FileText className="h-4 w-4 text-white" aria-hidden="true" />
            </span>
            {SITE.name}
          </p>
          <p className="mt-3 max-w-xs text-sm text-slate-600">
            Free PDF and image tools. Files are processed in your browser and never uploaded.
          </p>
          <p className="mt-4 text-xs text-slate-500">
            © {new Date().getFullYear()} {SITE.name}
          </p>
        </div>

        {GROUPS.map((g) => (
          <Column key={g} title={GROUP_LABEL[g]} links={toolsInGroup(g).map((t) => ({ name: t.name, href: t.href }))} />
        ))}

        <Column title="Company" links={COMPANY} />
      </div>
    </footer>
  );
}
