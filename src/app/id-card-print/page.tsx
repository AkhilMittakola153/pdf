import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import IdCardTool from "@/components/tools/IdCardTool";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Print Aadhaar Card Front and Back on One A4 Page – Free ID Card Print",
  description:
    "Put both sides of your Aadhaar, PAN, voter ID or driving licence on one A4 page at real size, ready to print or share. Works with photos or e-Aadhaar PDF. Nothing is uploaded.",
  path: "/id-card-print",
});

const steps = [
  "Add photos of the front and back of your card, or your e-Aadhaar or scanned PDF.",
  "Drag the box over each side of the card, rotate or straighten it if needed.",
  "Optionally cover the first 8 digits of your Aadhaar number, and choose the layout and number of copies.",
  "Download the A4 PDF or JPG and print it at 100% (actual size).",
];

const faqs = [
  {
    q: "Is my Aadhaar card uploaded anywhere?",
    a: "No. The photos or PDF are processed inside your browser and never leave your phone or computer. That's important for identity documents.",
  },
  {
    q: "What is the password of the e-Aadhaar PDF?",
    a: "It's the first 4 letters of your name in capital letters followed by your year of birth, for example SUNI1990. The password is used only in your browser to open the file.",
  },
  {
    q: "Will the card print at the correct size?",
    a: "Yes. Cards are placed at the standard ID card size of 85.6 × 54 mm. In the print dialog, choose 100% or Actual size, not Fit to page.",
  },
  {
    q: "Which cards does this work with?",
    a: "Any card-sized ID: Aadhaar, PAN, voter ID, driving licence, college or office ID, and debit or credit cards. Choose Vertical for cards printed upright.",
  },
  {
    q: "Should I hide my Aadhaar number?",
    a: "If the place you're submitting to doesn't need the full number, a copy that shows only the last 4 digits is safer. Use Cover part of the card to hide the first 8 digits.",
  },
];

export default function IdCardPrintPage() {
  return (
    <ToolPage
      path="/id-card-print"
      title="ID Card Print"
      intro="Print both sides of your Aadhaar, PAN, voter ID or any ID card on one A4 page at real size. Free, and your card never leaves your device."
      steps={steps}
      faqs={faqs}
    >
      <IdCardTool />
    </ToolPage>
  );
}
