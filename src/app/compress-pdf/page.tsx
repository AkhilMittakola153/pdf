import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import CompressPdfTool from "@/components/tools/CompressPdfTool";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Compress PDF Online – Reduce PDF File Size",
  description:
    "Make PDF files smaller for email and uploads. Choose Balanced, Strong or Maximum compression. Free and private: your PDF is compressed in your browser and never uploaded.",
  path: "/compress-pdf",
});

const steps = [
  "Drop a PDF into the upload box, or click Choose file.",
  "Pick a compression level. Balanced suits most documents.",
  "Click Compress PDF and see how much smaller the file became.",
  "Open the result to check the quality, then download it.",
];

const faqs = [
  {
    q: "Is my PDF uploaded to a server?",
    a: "No. Compression happens inside your browser, so your document never leaves your device.",
  },
  {
    q: "What is the difference between the levels?",
    a: "Balanced and Strong shrink the photos inside your PDF and leave text untouched, so text stays sharp and selectable. Maximum turns every page into an image, like a scan. It gives the smallest files, but the text can no longer be selected or searched.",
  },
  {
    q: "Why didn't my PDF get smaller?",
    a: "PDFs that are mostly text are already small, and some PDFs already have well-compressed images. If yours is a scanned document, try Maximum.",
  },
  {
    q: "Which level should I use for email?",
    a: "Start with Balanced. If the file is still too large for your email limit, try Strong, then Maximum.",
  },
  {
    q: "Will the quality be good enough to print?",
    a: "Balanced keeps good quality for reading and normal printing. Strong and Maximum are best for viewing on screen.",
  },
];

export default function CompressPdfPage() {
  return (
    <ToolPage
      path="/compress-pdf"
      title="Compress PDF"
      intro="Reduce the file size of your PDF for email, forms and uploads. Choose how much to compress, all inside your browser."
      steps={steps}
      faqs={faqs}
    >
      <CompressPdfTool />
    </ToolPage>
  );
}
