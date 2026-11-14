import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import StaticPage from "@/components/StaticPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Privacy Policy",
  description: `How ${SITE.name} handles your data. Your files are processed in your browser and never uploaded.`,
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return (
    <StaticPage title="Privacy Policy" updated={SITE.lastUpdated}>
      <p>
        This Privacy Policy explains what information {SITE.name} (&quot;we&quot;, &quot;us&quot;), operated by{" "}
        {SITE.owner}, collects when you use {SITE.url}, and how it is used.
      </p>

      <h2>1. Summary</h2>
      <ul>
        <li>
          <strong>Your files are never uploaded.</strong> All conversion, merging and resizing happens inside your
          browser on your own device.
        </li>
        <li>We do not ask for an account, your name or your email address to use the tools.</li>
        <li>The site shows ads from Google AdSense, which may use cookies as described below.</li>
      </ul>

      <h2>2. Files you process</h2>
      <p>
        When you add a PDF or image to one of our tools, it is read and processed locally by your web browser. The file
        and its contents are not sent to us or to any third party, and we cannot see them. Processed results are created
        on your device and are cleared from memory when you close or leave the page.
      </p>

      <h2>3. Information collected automatically</h2>
      <p>
        Like most websites, our hosting provider (Cloudflare) processes basic technical data, such as your IP address,
        browser type and the pages requested, to deliver the site and protect it from abuse. We may also use privacy-
        friendly analytics to count visits and see which tools are popular. This data is aggregated and is not used to
        identify you.
      </p>

      <h2>4. Advertising and cookies</h2>
      <p>
        We use Google AdSense to show advertisements. Third-party vendors, including Google, use cookies to serve ads
        based on your previous visits to this website and other websites. Google&apos;s use of advertising cookies
        enables it and its partners to serve ads to you based on your visits to this site and/or other sites on the
        internet.
      </p>
      <ul>
        <li>
          You can opt out of personalised advertising by visiting{" "}
          <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
            Google Ads Settings
          </a>
          .
        </li>
        <li>
          You can also opt out of some third-party vendors&apos; use of cookies for personalised advertising at{" "}
          <a href="https://www.aboutads.info/choices" target="_blank" rel="noopener noreferrer">
            www.aboutads.info
          </a>
          .
        </li>
        <li>
          Learn more in{" "}
          <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">
            How Google uses information from sites or apps that use its services
          </a>
          .
        </li>
      </ul>
      <p>
        You can also block or delete cookies in your browser settings. The tools themselves will keep working without
        cookies.
      </p>

      <h2>5. Consent (EEA, UK and Switzerland)</h2>
      <p>
        If you visit from the European Economic Area, the United Kingdom or Switzerland, we ask for your consent before
        personalised ads or non-essential cookies are used, through a consent message. You can change your choice at
        any time using the privacy settings link shown on the site.
      </p>

      <h2>6. Children</h2>
      <p>
        This site is not directed at children under 13, and we do not knowingly collect personal information from
        children.
      </p>

      <h2>7. Your rights</h2>
      <p>
        Because we do not store your files or ask for personal details, we usually hold no personal data about you.
        Depending on where you live, you may have rights to access, correct or delete personal data, or to object to its
        use. For data held by Google or Cloudflare, please use their privacy tools. For anything else, contact us.
      </p>

      <h2>8. Changes to this policy</h2>
      <p>
        We may update this policy from time to time. The &quot;Last updated&quot; date at the top shows when it last
        changed.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about this policy? Email <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> or visit our{" "}
        <Link href="/contact">contact page</Link>.
      </p>
    </StaticPage>
  );
}
