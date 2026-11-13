// Single list of all tools. The header, homepage and footer read from here,
// so adding a tool later means editing only this file.
import { Combine, FileImage, Images, Maximize2, Scaling } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Tool = {
  name: string;
  href: string;
  description: string;
  icon: LucideIcon;
};

export const TOOLS: Tool[] = [
  {
    name: "Image to PDF",
    href: "/image-to-pdf",
    description: "Turn JPG, PNG or WebP images into a single PDF.",
    icon: FileImage,
  },
  {
    name: "PDF to Image",
    href: "/pdf-to-image",
    description: "Export PDF pages as high-quality JPG or PNG images.",
    icon: Images,
  },
  {
    name: "Merge PDF",
    href: "/merge-pdf",
    description: "Combine several PDFs into one, in the order you choose.",
    icon: Combine,
  },
  {
    name: "Resize PDF",
    href: "/resize-pdf",
    description: "Change page size to A4, Letter, A3 and more.",
    icon: Scaling,
  },
  {
    name: "Resize Image",
    href: "/resize-image",
    description: "Change image dimensions, format and quality.",
    icon: Maximize2,
  },
];
