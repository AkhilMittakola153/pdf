"use client";

// Top navigation: logo + tool links. Collapses into a menu on mobile.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FileText, Menu, X } from "lucide-react";
import { TOOLS } from "@/lib/tools";
import { SITE } from "@/lib/site";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const linkClass = (href: string) =>
    `rounded-md px-3 py-2 text-sm font-medium ${
      pathname === href ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-slate-900" onClick={() => setOpen(false)}>
          <FileText className="h-6 w-6 text-blue-600" aria-hidden="true" />
          {SITE.name}
        </Link>

        <nav aria-label="Tools" className="hidden gap-1 lg:flex">
          {TOOLS.map((t) => (
            <Link key={t.href} href={t.href} className={linkClass(t.href)} aria-current={pathname === t.href ? "page" : undefined}>
              {t.name}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="rounded-md p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <nav id="mobile-menu" aria-label="Tools" className="border-t border-slate-200 bg-white px-4 py-2 lg:hidden">
          {TOOLS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`block ${linkClass(t.href)}`}
              aria-current={pathname === t.href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {t.name}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
