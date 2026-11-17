import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import SummarizePdfTool from "@/components/tools/SummarizePdfTool";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "AI PDF Summarizer – Key Points of Any PDF in Seconds",
  description:
    "Summarise a PDF into key points or a short summary with AI. Runs on your device when your browser supports it, so the document never leaves your computer. Free, no sign-up.",
  path: "/summarize-pdf",
});

const steps = [
  "Drop a PDF into the upload box, or click Choose file.",
  "Choose Key points or Short summary, and a length.",
  "Click Summarise on this device. If your browser can't, you can choose the optional cloud AI.",
  "Copy the summary or download it as a text file.",
];

const faqs = [
  {
    q: "Is my PDF uploaded?",
    a: "Not by default. If your browser has built-in AI (recent Chrome or Edge on a capable computer), the summary is made on your device and nothing leaves it. Only if you tick the box for cloud AI is the document's text (never the file itself) sent to Cloudflare Workers AI, and we don't store it.",
  },
  {
    q: "Why can't my phone summarise on the device?",
    a: "On-device AI in browsers currently needs a desktop computer with enough memory and storage. On phones you can use the optional cloud AI instead.",
  },
  {
    q: "Why does it say my PDF has no text?",
    a: "Scanned documents and PDFs made from photos contain pictures of text, not real text. Summaries need real text, so these can't be summarised yet.",
  },
  {
    q: "How accurate are the summaries?",
    a: "Usually good for getting the gist, but AI can miss details or make mistakes. Always check important facts, numbers and dates in the original document.",
  },
  {
    q: "Is there a length limit?",
    a: "Very long documents are summarised from their first part. On-device mode reads much more text than cloud mode.",
  },
];

export default function SummarizePdfPage() {
  return (
    <ToolPage
      path="/summarize-pdf"
      title="AI PDF Summarizer"
      intro="Get the key points of a long PDF in seconds. Private by default: summaries are made on your device whenever your browser supports it."
      steps={steps}
      faqs={faqs}
    >
      <SummarizePdfTool />
    </ToolPage>
  );
}
