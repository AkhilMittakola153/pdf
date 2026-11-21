import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import SignatureTool from "@/components/tools/SignatureTool";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Signature Resize & Background Remover – 10 to 20 KB for Online Forms",
  description:
    "Turn a photo of your signature into clean black or blue ink on white or transparent background, at the exact pixel size and KB limit forms ask for. Free, nothing is uploaded.",
  path: "/signature-resize",
});

const steps = [
  "Sign on plain white paper with a dark pen and take a clear photo.",
  "Drag the box around your signature and straighten it if needed.",
  "Adjust Ink detection until the strokes look clean, and pick black or blue ink.",
  "Download a transparent PNG, or a JPG at the exact pixel size and KB limit your form needs.",
];

const faqs = [
  {
    q: "How do I resize my signature to under 20 KB?",
    a: "Enter 20 in Max size (KB), and the width and height in pixels if the form gives them (for example 140 × 60). Tap Download JPG; the file keeps that pixel size and stays under the limit.",
  },
  {
    q: "Does it remove shadows and the grey paper background?",
    a: "Yes. It compares each part of the signature with the paper around it, so shadows and uneven light are removed and only the ink is kept.",
  },
  {
    q: "Is my signature uploaded?",
    a: "No. Your signature is processed in your browser and never leaves your device, which matters for something as personal as a signature.",
  },
  {
    q: "What is the transparent PNG for?",
    a: "A transparent signature can be placed on documents without a white box around it, for example with our Sign PDF tool or in Word.",
  },
];

export default function SignatureResizePage() {
  return (
    <ToolPage
      path="/signature-resize"
      title="Signature Resize & Cleaner"
      intro="Clean up a photo of your signature: remove the background and shadows, then save it as a transparent PNG or a JPG at the exact size and KB your form needs."
      steps={steps}
      faqs={faqs}
    >
      <SignatureTool />
    </ToolPage>
  );
}
