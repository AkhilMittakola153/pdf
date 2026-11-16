// Single list of all tools. Header, homepage, footer, related tools and
// "next step" buttons all read from here.
import { Combine, FileImage, Images, LayoutGrid, Maximize2, Minimize2, RefreshCw, RotateCw, Scaling, Scissors } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ToolGroup = "pdf" | "image";

export type Tool = {
  name: string;
  href: string;
  description: string; // homepage card
  short: string; // menus and buttons
  icon: LucideIcon;
  group: ToolGroup; // colour and menu section
  accepts: ToolGroup; // which files the tool takes
  multiple: boolean; // takes several files?
};

export const TOOLS: Tool[] = [
  {
    name: "Image to PDF",
    href: "/image-to-pdf",
    description: "Turn JPG, PNG or WebP images into a single PDF.",
    short: "Turn JPG, PNG or WebP into a PDF",
    icon: FileImage,
    group: "image",
    accepts: "image",
    multiple: true,
  },
  {
    name: "Compress PDF",
    href: "/compress-pdf",
    description: "Make PDFs smaller for email and uploads by shrinking images.",
    short: "Reduce PDF file size",
    icon: Minimize2,
    group: "pdf",
    accepts: "pdf",
    multiple: false,
  },
  {
    name: "PDF to Image",
    href: "/pdf-to-image",
    description: "Export PDF pages as high-quality JPG or PNG images.",
    short: "Export pages as JPG or PNG",
    icon: Images,
    group: "pdf",
    accepts: "pdf",
    multiple: false,
  },
  {
    name: "Merge PDF",
    href: "/merge-pdf",
    description: "Combine several PDFs into one, in the order you choose.",
    short: "Combine PDFs in any order",
    icon: Combine,
    group: "pdf",
    accepts: "pdf",
    multiple: true,
  },
  {
    name: "Organize PDF",
    href: "/organize-pdf",
    description: "Reorder, delete and rotate pages visually, then save.",
    short: "Reorder, delete and rotate pages",
    icon: LayoutGrid,
    group: "pdf",
    accepts: "pdf",
    multiple: false,
  },
  {
    name: "Split PDF",
    href: "/split-pdf",
    description: "Extract pages or split a PDF into several smaller files.",
    short: "Extract pages or split into parts",
    icon: Scissors,
    group: "pdf",
    accepts: "pdf",
    multiple: false,
  },
  {
    name: "Resize PDF",
    href: "/resize-pdf",
    description: "Change page size to A4, Letter, A3 and more.",
    short: "Change page size to A4, Letter…",
    icon: Scaling,
    group: "pdf",
    accepts: "pdf",
    multiple: false,
  },
  {
    name: "Rotate PDF",
    href: "/rotate-pdf",
    description: "Turn sideways or upside-down pages the right way up.",
    short: "Rotate all or single pages",
    icon: RotateCw,
    group: "pdf",
    accepts: "pdf",
    multiple: false,
  },
  {
    name: "Convert Image",
    href: "/convert-image",
    description: "Convert between JPG, PNG and WebP in bulk.",
    short: "JPG, PNG and WebP, any direction",
    icon: RefreshCw,
    group: "image",
    accepts: "image",
    multiple: true,
  },
  {
    name: "Compress Image",
    href: "/compress-image",
    description: "Shrink photos to a target size like 100 KB for forms and uploads.",
    short: "Reduce image size, e.g. under 100 KB",
    icon: Minimize2,
    group: "image",
    accepts: "image",
    multiple: true,
  },
  {
    name: "Resize Image",
    href: "/resize-image",
    description: "Change image dimensions, format and quality.",
    short: "Change pixels, format and quality",
    icon: Maximize2,
    group: "image",
    accepts: "image",
    multiple: true,
  },
];

export const GROUP_LABEL: Record<ToolGroup, string> = { pdf: "PDF tools", image: "Image tools" };

/** Tailwind colour classes per group: PDF = blue, Image = green */
export const GROUP_COLOR: Record<ToolGroup, { tile: string; tileHover: string }> = {
  pdf: { tile: "bg-blue-50 text-blue-600", tileHover: "group-hover:bg-blue-600 group-hover:text-white" },
  image: { tile: "bg-emerald-50 text-emerald-600", tileHover: "group-hover:bg-emerald-600 group-hover:text-white" },
};

export const toolsInGroup = (g: ToolGroup) => TOOLS.filter((t) => t.group === g);
