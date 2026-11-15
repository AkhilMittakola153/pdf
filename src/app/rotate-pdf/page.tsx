import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import RotatePdfTool from "@/components/tools/RotatePdfTool";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Rotate PDF Online – Turn Pages the Right Way Up",
  description:
    "Rotate all pages or single pages of a PDF left or right and save it permanently. Free, lossless and private: your PDF never leaves your device.",
  path: "/rotate-pdf",
});

const steps = [
  "Drop a PDF into the upload box, or click Choose file.",
  "Tap a page to turn it right, use the arrows under it, or rotate all pages at once.",
  "Click Save PDF, then open or download your rotated file.",
];

const faqs = [
  {
    q: "Is my PDF uploaded to a server?",
    a: "No. Rotation happens inside your browser, so your document never leaves your device.",
  },
  {
    q: "Does rotating reduce quality?",
    a: "No. Only the page orientation setting is changed. Text, images and fonts stay exactly the same, and text remains selectable.",
  },
  {
    q: "Is the rotation permanent?",
    a: "Yes. The saved PDF opens with the new orientation in any PDF reader, on any device.",
  },
  {
    q: "Can I rotate only some pages?",
    a: "Yes. Rotate each page on its own with the arrows under it, or use All left / All right to turn every page.",
  },
  {
    q: "Can I rotate a password-protected PDF?",
    a: "Not yet. Remove the password in your PDF reader first, then rotate the unlocked file.",
  },
];

export default function RotatePdfPage() {
  return (
    <ToolPage
      path="/rotate-pdf"
      title="Rotate PDF"
      intro="Turn sideways or upside-down pages the right way up. Rotate all pages or just the ones you need, with no quality loss."
      steps={steps}
      faqs={faqs}
    >
      <RotatePdfTool />
    </ToolPage>
  );
}
