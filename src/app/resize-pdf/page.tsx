import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import ResizePdfTool from "@/components/tools/ResizePdfTool";

export const metadata: Metadata = {
  title: "Resize PDF Online – Change Page Size to A4, Letter, A3",
  description:
    "Change the page size of a PDF to A4, Letter, A3, A5, Legal or a custom size. Content is scaled to fit without stretching. Free and private: your PDF never leaves your device.",
};

const steps = [
  "Drop a PDF into the upload box, or click Choose file.",
  "Pick the new page size (or enter a custom size), orientation and margin.",
  "Check the preview of page 1, then click Resize PDF.",
  "Open the result to check it, then download your resized PDF.",
];

const faqs = [
  {
    q: "Is my PDF uploaded to a server?",
    a: "No. Resizing happens inside your browser, so your document never leaves your device.",
  },
  {
    q: "Will my content be stretched or cut off?",
    a: "No. Each page is scaled to fit the new size while keeping its proportions and centred on the page. If the shapes differ, white space is added at the sides or top and bottom.",
  },
  {
    q: "Does the text stay sharp and searchable?",
    a: "Yes. Pages are scaled as vector content, not turned into images, so text stays sharp and can still be selected.",
  },
  {
    q: "What does “Auto” orientation do?",
    a: "Portrait pages stay portrait and landscape pages stay landscape, so each page uses the new size as fully as possible.",
  },
  {
    q: "Are links and form fields kept?",
    a: "The visible content is kept exactly, but clickable links, comments and fillable form fields are not carried over to the resized pages.",
  },
];

export default function ResizePdfPage() {
  return (
    <ToolPage
      title="Resize PDF"
      intro="Change PDF page size to A4, Letter, A3 and more. Content is scaled to fit without stretching, and everything happens in your browser."
      steps={steps}
      faqs={faqs}
    >
      <ResizePdfTool />
    </ToolPage>
  );
}
