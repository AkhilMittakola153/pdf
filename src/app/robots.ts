// Generates /robots.txt: allows all search engines and points them to the sitemap.
import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export const dynamic = "force-static"; // required for static export

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
