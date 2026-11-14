// Builds page metadata (title, description, canonical URL, social previews)
// the same way for every page.
import type { Metadata } from "next";
import { SITE } from "@/lib/site";

const OG_IMAGE = { url: "/og-image.png", width: 1200, height: 630, alt: `${SITE.name}: PDF and image tools` };

export function pageMeta({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string; // e.g. "/merge-pdf"
}): Metadata {
  const fullTitle = `${title} | ${SITE.name}`;
  return {
    title,
    description,
    alternates: { canonical: path }, // tells Google the one official URL of this page
    openGraph: {
      type: "website",
      siteName: SITE.name,
      title: fullTitle,
      description,
      url: path,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [OG_IMAGE.url],
    },
  };
}

/** Safe JSON for <script type="application/ld+json"> */
export function jsonLd(data: unknown): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
