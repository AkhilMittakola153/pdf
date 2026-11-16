import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import PdfEditor from "@/components/editor/PdfEditor";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Edit PDF Online – Add Text, White-out, Highlight and Draw",
  description:
    "Edit PDFs in your browser: add text, cover mistakes with white-out, highlight, draw, insert images and sign. Free and private: your PDF never leaves your device.",
  path: "/edit-pdf",
});

const steps = [
  "Drop a PDF into the upload box, or click Choose file.",
  "Pick a tool: Text, White-out, Highlight, Draw, Image or Sign.",
  "Tap or drag on the page. Use Select to move, resize or delete what you added.",
  "Click Save PDF, then open or download your edited file.",
];

const faqs = [
  {
    q: "Is my PDF uploaded to a server?",
    a: "No. Editing happens inside your browser, so your document never leaves your device.",
  },
  {
    q: "Can I change the existing text in a PDF?",
    a: "Not directly. The reliable way is to cover the old text with White-out and type the new text on top with the Text tool. That is how most free PDF editors do it.",
  },
  {
    q: "Is white-out safe for hiding confidential information?",
    a: "No. White-out hides text visually, but the original text may still be copied or searched. Don't use it for passwords, account numbers or other secrets.",
  },
  {
    q: "Can I type in Hindi or other languages?",
    a: "Not yet. The Text tool currently supports English letters, numbers and common symbols. Support for more languages is planned.",
  },
  {
    q: "Can I edit my additions after saving?",
    a: "Before saving, everything can be moved, resized or deleted, and Undo works. After saving, the additions become part of the page.",
  },
];

export default function EditPdfPage() {
  return (
    <ToolPage
      path="/edit-pdf"
      title="Edit PDF"
      intro="Add text, white-out mistakes, highlight, draw, insert images or sign, right in your browser. No sign-up, no upload."
      steps={steps}
      faqs={faqs}
    >
      <PdfEditor mode="edit" />
    </ToolPage>
  );
}
