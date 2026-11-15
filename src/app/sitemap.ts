// Generates /sitemap.xml at build time: the list of pages Google should index.
import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { TOOLS } from "@/lib/tools";
import { GUIDES } from "@/lib/guides";

export const dynamic = "force-static"; // required for static export

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${SITE.url}${path}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority,
  });

  return [
    page("/", 1),
    ...TOOLS.map((t) => page(t.href, 0.9)),
    page("/guides", 0.6),
    ...GUIDES.map((g) => page(`/guides/${g.slug}`, 0.6)),
    page("/about", 0.5),
    page("/contact", 0.4),
    page("/privacy-policy", 0.3),
    page("/terms", 0.3),
  ];
}
