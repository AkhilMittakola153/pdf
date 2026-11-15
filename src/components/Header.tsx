"use client";

// Top bar: logo, "All tools" dropdown (laptop) or ☰ menu (phone), About, Contact.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileText, Lock, Menu, X } from "lucide-react";
import { SITE } from "@/lib/site";
import { GROUP_COLOR, GROUP_LABEL, toolsInGroup, type Tool, type ToolGroup } from "@/lib/tools";

const GROUPS: ToolGroup[] = ["pdf", "image"];
const PAGES = [
  { name: "Guides", href: "/guides" },
  { name: "About", href: "/about" },
  { name: "Contact", href: "/contact" },
];

function ToolLink({ tool, active, onClick }: { tool: Tool; active: boolean; onClick: () => void }) {
  const Icon = tool.icon;
  return (
    <Link
      href={tool.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex gap-3 rounded-xl p-3 focus-visible:outline-2 focus-visible:outline-blue-600 ${
        active ? "bg-blue-50" : "hover:bg-slate-100"
      }`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${GROUP_COLOR[tool.group].tile}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-slate-900">{tool.name}</span>
        <span className="block text-xs text-slate-500">{tool.short}</span>
      </span>
    </Link>
  );
}

function GroupList({ group, pathname, close }: { group: ToolGroup; pathname: string; close: () => void }) {
  return (
    <div>
      <p className="px-3 pb-1 text-xs font-bold uppercase tracking-wider text-slate-400">{GROUP_LABEL[group]}</p>
      {toolsInGroup(group).map((t) => (
        <ToolLink key={t.href} tool={t} active={pathname === t.href} onClick={close} />
      ))}
    </div>
  );
}

export default function Header() {
  const pathname = usePathname();
  const [toolsOpen, setToolsOpen] = useState(false); // laptop dropdown
  const [menuOpen, setMenuOpen] = useState(false); // phone menu
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click or Escape
  useEffect(() => {
    if (!toolsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setToolsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setToolsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [toolsOpen]);

  const closeAll = () => {
    setToolsOpen(false);
    setMenuOpen(false);
  };

  const pageLink = (href: string) =>
    `rounded-lg px-3 py-2 text-sm font-medium ${
      pathname === href ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" onClick={closeAll} className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <FileText className="h-5 w-5 text-white" aria-hidden="true" />
          </span>
          {SITE.name}
        </Link>

        {/* Laptop */}
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setToolsOpen((o) => !o)}
              aria-expanded={toolsOpen}
              aria-controls="tools-menu"
              className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium ${
                toolsOpen ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              All tools
              <ChevronDown className={`h-4 w-4 transition ${toolsOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>

            {toolsOpen && (
              <div
                id="tools-menu"
                className="absolute right-0 top-full mt-2 w-[600px] rounded-2xl border border-slate-200 bg-white shadow-xl"
              >
                <div className="grid grid-cols-2 gap-2 p-4">
                  {GROUPS.map((g) => (
                    <GroupList key={g} group={g} pathname={pathname} close={closeAll} />
                  ))}
                </div>
                <p className="flex items-center gap-2 rounded-b-2xl border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-600">
                  <Lock className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  All tools run in your browser. Your files never leave your device.
                </p>
              </div>
            )}
          </div>
          {PAGES.map((p) => (
            <Link key={p.href} href={p.href} className={pageLink(p.href)} aria-current={pathname === p.href ? "page" : undefined}>
              {p.name}
            </Link>
          ))}
        </nav>

        {/* Phone */}
        <button
          type="button"
          className="rounded-md p-2 text-slate-700 hover:bg-slate-100 md:hidden"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </div>

      {menuOpen && (
        <nav id="mobile-menu" aria-label="Main" className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-slate-200 bg-white px-2 py-3 md:hidden">
          <div className="space-y-3">
            {GROUPS.map((g) => (
              <GroupList key={g} group={g} pathname={pathname} close={closeAll} />
            ))}
          </div>
          <div className="mt-2 flex gap-2 border-t border-slate-200 px-1 pt-3">
            {PAGES.map((p) => (
              <Link key={p.href} href={p.href} onClick={closeAll} className={pageLink(p.href)}>
                {p.name}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
