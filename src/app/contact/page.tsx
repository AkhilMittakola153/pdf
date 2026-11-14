import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { Mail } from "lucide-react";
import StaticPage from "@/components/StaticPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Contact",
  description: `Contact ${SITE.name} with questions, bug reports or feature ideas.`,
  path: "/contact",
});

export default function ContactPage() {
  const subject = encodeURIComponent(`${SITE.name} feedback`);
  return (
    <StaticPage title="Contact us">
      <p>
        Questions, bug reports, feature ideas or business enquiries are all welcome. The quickest way to reach us is by
        email:
      </p>

      <p>
        <a
          href={`mailto:${SITE.contactEmail}?subject=${subject}`}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600! px-5 py-3 text-white! no-underline! hover:bg-blue-700!"
        >
          <Mail className="h-5 w-5" aria-hidden="true" />
          {SITE.contactEmail}
        </a>
      </p>

      <h2>Reporting a problem</h2>
      <p>To help us fix an issue quickly, please include:</p>
      <ul>
        <li>which tool you were using (for example, Merge PDF)</li>
        <li>your device and browser (for example, Android phone with Chrome)</li>
        <li>what you expected to happen and what happened instead</li>
        <li>the exact error message, or a screenshot</li>
      </ul>

      <h2>Please don&apos;t send private files</h2>
      <p>
        Our tools never upload your files, and we&apos;d like to keep it that way. Please do not email us confidential
        documents. If a specific file causes a problem, describe it instead (for example, &quot;a 200-page scanned
        PDF&quot;) or create a harmless test file that shows the same issue.
      </p>
    </StaticPage>
  );
}
