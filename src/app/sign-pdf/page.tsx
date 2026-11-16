import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import PdfEditor from "@/components/editor/PdfEditor";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Sign PDF Online – Draw, Type or Upload Your Signature",
  description:
    "Sign PDF documents in your browser: draw, type or upload your signature, place it anywhere and add the date. Free and private: your PDF and signature never leave your device.",
  path: "/sign-pdf",
});

const steps = [
  "Drop the PDF you need to sign, or click Choose file.",
  "Create your signature: draw it, type your name, or upload a photo of it.",
  "Tap where the signature should go, then drag the corner to resize it.",
  "Add the date or your name with the Date and Text tools if needed, then click Save PDF.",
];

const faqs = [
  {
    q: "Is my signature uploaded anywhere?",
    a: "No. Your PDF and your signature stay on your device. Everything is done inside your browser.",
  },
  {
    q: "Is this a legally valid signature?",
    a: "This adds an image of your signature (an electronic signature), which is accepted for many everyday documents. Some documents legally require a certified digital signature (for example a DSC in India). If in doubt, check with the organisation asking for your signature.",
  },
  {
    q: "Can I sign on my phone?",
    a: "Yes. Draw your signature with your finger, then tap the page to place it.",
  },
  {
    q: "Can I sign several pages?",
    a: "Yes. After creating your signature once, choose Sign again and tap each page where it is needed.",
  },
  {
    q: "How do I get a clean uploaded signature?",
    a: "Sign on plain white paper with a dark pen, photograph it in good light, and crop it closely before uploading.",
  },
];

export default function SignPdfPage() {
  return (
    <ToolPage
      path="/sign-pdf"
      title="Sign PDF"
      intro="Draw, type or upload your signature and place it on any page, with the date if needed. Fast, free and private."
      steps={steps}
      faqs={faqs}
    >
      <PdfEditor mode="sign" />
    </ToolPage>
  );
}
