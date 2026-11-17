import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import WatermarkTool from "@/components/tools/WatermarkTool";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Add Watermark to PDF Online – CONFIDENTIAL, DRAFT and More",
  description:
    "Stamp a text watermark such as CONFIDENTIAL, DRAFT or your name on PDF pages. Choose position, angle, size, colour and opacity. Free and private: your PDF never leaves your device.",
  path: "/watermark-pdf",
});

const steps = [
  "Drop a PDF into the upload box, or click Choose file.",
  "Type your watermark text or tap a preset such as CONFIDENTIAL or DRAFT.",
  "Choose centre or tiled, the angle, size, colour and opacity, and check the preview.",
  "Pick all pages or specific ones, click Add watermark, then download.",
];

const faqs = [
  {
    q: "Is my PDF uploaded to a server?",
    a: "No. The watermark is added inside your browser, so your document never leaves your device.",
  },
  {
    q: "Centre or tiled: which should I use?",
    a: "Centre places one large stamp in the middle of each page, which is clear and tidy. Tiled repeats the text across the whole page, which makes it much harder to crop out.",
  },
  {
    q: "Will the watermark hide my content?",
    a: "Not at the default opacity of 25%: the text underneath stays readable. Raise the opacity for a stronger stamp.",
  },
  {
    q: "Can the watermark be removed later?",
    a: "The watermark is drawn into the pages, so it can't simply be switched off. Your original file is never changed, so keep it if you may need an unmarked copy.",
  },
  {
    q: "Can I use Hindi or other languages?",
    a: "Not yet. Watermark text currently supports English letters, numbers and common symbols.",
  },
];

export default function WatermarkPdfPage() {
  return (
    <ToolPage
      path="/watermark-pdf"
      title="Add Watermark"
      intro="Stamp CONFIDENTIAL, DRAFT or any text across your PDF pages, centred or tiled. Fast, free and private."
      steps={steps}
      faqs={faqs}
    >
      <WatermarkTool />
    </ToolPage>
  );
}
