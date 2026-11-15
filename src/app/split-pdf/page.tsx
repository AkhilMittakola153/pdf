import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import SplitPdfTool from "@/components/tools/SplitPdfTool";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Split PDF Online – Extract Pages or Split into Files",
  description:
    "Extract selected pages, split a PDF by page ranges, or save every page as its own PDF. Free, lossless and private: your PDF never leaves your device.",
  path: "/split-pdf",
});

const steps = [
  "Drop a PDF into the upload box, or click Choose file.",
  "Choose a mode: Extract pages (one new PDF), Split by ranges (one PDF per range) or Every N pages.",
  "Select pages or type ranges such as 1-3, 4-8, and check the preview of the files to be created.",
  "Click the button, then download each PDF or all of them as a ZIP.",
];

const faqs = [
  {
    q: "Is my PDF uploaded to a server?",
    a: "No. Splitting happens inside your browser, so your document never leaves your device.",
  },
  {
    q: "What is the difference between the modes?",
    a: "Extract pages puts the pages you choose into one new PDF. Split by ranges creates one PDF for each range you type. Every N pages cuts the document into equal parts, for example one PDF per page.",
  },
  {
    q: "Will the quality change?",
    a: "No. Pages are copied exactly as they are, so text stays sharp and selectable and images are not recompressed.",
  },
  {
    q: "How do I type page ranges?",
    a: "Use commas between ranges and a dash inside a range, for example 1-3, 5, 8-10.",
  },
  {
    q: "Is there a limit?",
    a: "PDFs up to 100 MB, and up to 300 new files per split. Previews are shown for the first 60 pages.",
  },
];

export default function SplitPdfPage() {
  return (
    <ToolPage
      path="/split-pdf"
      title="Split PDF"
      intro="Extract the pages you need or split a PDF into several smaller files. Fast, free and lossless, right in your browser."
      steps={steps}
      faqs={faqs}
    >
      <SplitPdfTool />
    </ToolPage>
  );
}
