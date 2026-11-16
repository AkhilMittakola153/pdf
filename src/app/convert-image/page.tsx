import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import ConvertImageTool from "@/components/tools/ConvertImageTool";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Convert Image Online – JPG to PNG, PNG to JPG, WebP to JPG",
  description:
    "Convert images between JPG, PNG and WebP in bulk: WebP to JPG, PNG to JPG, JPG to PNG and more. Free and private: images never leave your device.",
  path: "/convert-image",
});

const steps = [
  "Drop your JPG, PNG or WebP images into the upload box, or click Choose files.",
  "Choose the format to convert to: JPG, PNG or WebP.",
  "For JPG, pick a background colour for any transparent areas.",
  "Click Convert, then download each image or all of them as a ZIP.",
];

const faqs = [
  {
    q: "Are my images uploaded to a server?",
    a: "No. Conversion happens inside your browser, so your images never leave your device.",
  },
  {
    q: "How do I convert WebP to JPG?",
    a: "Add your WebP images, choose JPG and click Convert. This is handy when a website or app doesn't accept WebP files.",
  },
  {
    q: "Which format should I choose?",
    a: "JPG for photos and anywhere you need maximum compatibility. PNG for logos, screenshots and images with text or transparency. WebP for the smallest files on modern websites.",
  },
  {
    q: "Will converting reduce quality?",
    a: "Converting to PNG is lossless. JPG and WebP use compression; at the default quality of 90 the difference is very hard to see.",
  },
  {
    q: "What happens to transparent backgrounds?",
    a: "PNG and WebP keep transparency. JPG cannot, so transparent areas are filled with the background colour you choose (white by default).",
  },
];

export default function ConvertImagePage() {
  return (
    <ToolPage
      path="/convert-image"
      title="Convert Image"
      intro="Convert images between JPG, PNG and WebP: WebP to JPG, PNG to JPG, JPG to PNG and more. Bulk conversion, right in your browser."
      steps={steps}
      faqs={faqs}
    >
      <ConvertImageTool />
    </ToolPage>
  );
}
