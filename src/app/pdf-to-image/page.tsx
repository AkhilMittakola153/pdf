import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import ToolPage from "@/components/ToolPage";
import PdfToImageTool from "@/components/tools/PdfToImageTool";

export const metadata: Metadata = pageMeta({
  title: "PDF to Image Converter Online – PDF to JPG or PNG",
  description: "Convert PDF pages to high-quality JPG or PNG images. Pick pages, choose 72, 150 or 300 DPI, and download as a ZIP. Free and private: your PDF never leaves your device.",
  path: "/pdf-to-image",
});

const steps = [
  "Drop a PDF into the upload box, or click Choose file.",
  "Click pages to select or deselect them, or type a range such as 1-3, 5.",
  "Choose JPG or PNG and a resolution (150 DPI suits most uses, 300 DPI is for printing).",
  "Click Convert, then download single images or all of them as a ZIP.",
];

const faqs = [
  {
    q: "Is my PDF uploaded to a server?",
    a: "No. Pages are rendered inside your browser, so your document never leaves your device.",
  },
  {
    q: "Should I choose JPG or PNG?",
    a: "JPG gives much smaller files and suits pages with photos. PNG keeps text perfectly sharp and is better for documents and diagrams, but files are larger.",
  },
  {
    q: "What DPI should I use?",
    a: "72 DPI is enough for viewing on screen, 150 DPI is a good all-round choice, and 300 DPI is best for printing. Higher DPI means larger files.",
  },
  {
    q: "Can I convert password-protected PDFs?",
    a: "Not yet. Remove the password in your PDF reader first, then convert the unlocked file.",
  },
  {
    q: "Is there a page limit?",
    a: "You can convert up to 100 pages at a time from a PDF of up to 100 MB. For longer documents, convert in batches using the page range box.",
  },
];

export default function PdfToImagePage() {
  return (
    <ToolPage
      path="/pdf-to-image"
      title="PDF to Image"
      intro="Turn PDF pages into JPG or PNG images. Choose the pages and resolution you need. Fast, free and private."
      steps={steps}
      faqs={faqs}
    >
      <PdfToImageTool />
    </ToolPage>
  );
}
