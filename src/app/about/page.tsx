import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import StaticPage from "@/components/StaticPage";
import { SITE } from "@/lib/site";
import { TOOLS } from "@/lib/tools";

export const metadata: Metadata = pageMeta({
  title: "About",
  description: `About ${SITE.name}: free PDF and image tools that run entirely in your browser, so your files never leave your device.`,
  path: "/about",
});

export default function AboutPage() {
  return (
    <StaticPage title={`About ${SITE.name}`}>
      <p>
        {SITE.name} is a free set of tools for everyday PDF and image tasks: converting, merging and resizing. It was
        built for people who need a quick result without installing software, creating an account or uploading private
        documents to an unknown server.
      </p>

      <h2>Your files stay on your device</h2>
      <p>
        Most online converters upload your file to their servers, process it there and send it back. {SITE.name} works
        differently: every tool runs <strong>inside your web browser</strong>, using your own device&apos;s processor.
        Your files are never uploaded, stored or seen by us. Once the page has loaded, the tools even keep working if
        your internet connection drops.
      </p>

      <h2>Our tools</h2>
      <ul>
        {TOOLS.map((t) => (
          <li key={t.href}>
            <Link href={t.href}>{t.name}</Link>: {t.description}
          </li>
        ))}
      </ul>

      <h2>How it works</h2>
      <p>
        The tools are built with modern, open-source web technology: <strong>pdf-lib</strong> for creating and editing
        PDFs, Mozilla&apos;s <strong>PDF.js</strong> for reading and rendering PDF pages, and the browser&apos;s built-in
        Canvas for resizing images. Because the work happens on your device, speed depends on your phone or computer
        and on the size of your files.
      </p>

      <h2>Free to use</h2>
      <p>
        {SITE.name} is free, with no sign-up and no watermarks. The site is supported by advertising, which helps cover
        hosting and development costs. See our <Link href="/privacy-policy">Privacy Policy</Link> for how advertising
        works on this site.
      </p>

      <h2>Get in touch</h2>
      <p>
        Found a bug, or have an idea for a new tool? We&apos;d love to hear from you on our{" "}
        <Link href="/contact">contact page</Link>.
      </p>
    </StaticPage>
  );
}
