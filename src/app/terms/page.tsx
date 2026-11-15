import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import StaticPage from "@/components/StaticPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Terms of Use",
  description: `The terms that apply when you use ${SITE.name}.`,
  path: "/terms",
});

export default function TermsPage() {
  return (
    <StaticPage title="Terms of Use" updated={SITE.lastUpdated}>
      <p>
        These Terms of Use apply to your use of {SITE.name} at {SITE.url} (the &quot;Service&quot;), operated by{" "}
        {SITE.owner}. By using the Service, you agree to these terms. If you do not agree, please do not use it.
      </p>

      <h2>1. The Service</h2>
      <p>
        {SITE.name} provides free online tools to convert, merge and resize PDF and image files. The tools run in your
        web browser; your files are processed on your device and are not uploaded to us. We may add, change or remove
        features at any time.
      </p>

      <h2>2. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for anything unlawful, or to process content you do not have the right to use;</li>
        <li>Attempt to disrupt, overload or gain unauthorised access to the Service or its hosting;</li>
        <li>Copy, resell or republish the Service or its design as your own;</li>
        <li>Use automated tools to scrape the site or to generate fake ad impressions or clicks.</li>
      </ul>

      <h2>3. Your files and content</h2>
      <p>
        You keep all rights to the files you process. You are responsible for your files and for making sure you are
        allowed to convert or edit them. Always keep a copy of your original files.
      </p>

      <h2>4. No warranty</h2>
      <p>
        The Service is provided &quot;as is&quot; and &quot;as available&quot;, free of charge, without warranties of
        any kind. We do our best to make the tools accurate and reliable, but we do not guarantee that results will be
        error-free, that the Service will always be available, or that it will meet your specific needs. Please check
        your output files before relying on them.
      </p>

      <h2>5. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, {SITE.owner} is not liable for any indirect, incidental or
        consequential loss, or for any loss of data, profits or business, arising from your use of, or inability to use,
        the Service.
      </p>

      <h2>6. Intellectual property</h2>
      <p>
        The {SITE.name} name, website design and original content belong to {SITE.owner}. Open-source libraries used by
        the Service remain under their own licences.
      </p>

      <h2>7. Advertising and third-party links</h2>
      <p>
        The Service shows ads and may link to other websites. We are not responsible for the content, products or
        privacy practices of advertisers or third-party sites. See our <Link href="/privacy-policy">Privacy Policy</Link>{" "}
        for details on advertising cookies.
      </p>

      <h2>8. Changes to these terms</h2>
      <p>
        We may update these terms from time to time. The &quot;Last updated&quot; date shows the latest version.
        Continuing to use the Service after a change means you accept the updated terms.
      </p>

      <h2>9. Governing law</h2>
      <p>These terms are governed by the laws of {SITE.country}.</p>

      <h2>10. Contact</h2>
      <p>
        Questions about these terms? Email <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
      </p>
    </StaticPage>
  );
}
