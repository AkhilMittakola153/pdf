import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import CropImageTool from "@/components/tools/CropImageTool";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Crop Image Online Free – Square, 16:9, Custom Ratio",
  description:
    "Crop JPG, PNG or WebP images to any shape: free, square, 4:3, 16:9, Instagram story or a custom ratio. Rotate and straighten too. Free, and nothing is uploaded.",
  path: "/crop-image",
});

const steps = [
  "Add a JPG, PNG or WebP image.",
  "Pick a shape (Free, Square, 16:9, Story or Custom), then drag and resize the box.",
  "Rotate or straighten the image if needed.",
  "Choose the format and tap Crop & download.",
];

const faqs = [
  {
    q: "Does cropping reduce the image quality?",
    a: "No. The cropped part keeps the original pixels. Only very large images (over about 11 megapixels) are reduced slightly so that phones can handle them.",
  },
  {
    q: "Are transparent PNG backgrounds kept?",
    a: "Yes, when you save as PNG or WebP. JPG has no transparency, so transparent areas become white.",
  },
  {
    q: "Is my image uploaded?",
    a: "No. The image is cropped inside your browser and never leaves your device.",
  },
  {
    q: "How do I crop to an exact pixel size?",
    a: "Crop to the right shape first, for example 1:1 for 600 × 600 px, then use Continue with Resize Image to set the exact pixel size.",
  },
];

export default function CropImagePage() {
  return (
    <ToolPage
      path="/crop-image"
      title="Crop Image"
      intro="Crop photos and images to any shape, from square to 16:9 or a custom ratio. Free and private: your image never leaves your device."
      steps={steps}
      faqs={faqs}
    >
      <CropImageTool />
    </ToolPage>
  );
}
