import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import CompressImageTool from "@/components/tools/CompressImageTool";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Compress Image Online – Reduce Photo Size to 20, 50 or 100 KB",
  description:
    "Reduce JPG, PNG and WebP images to a target size like 50 KB or 100 KB for online forms and uploads. Free and private: images never leave your device.",
  path: "/compress-image",
});

const steps = [
  "Drop your JPG, PNG or WebP images into the upload box, or click Choose files.",
  "Choose Target size and pick a limit such as 100 KB, or choose Quality to set it yourself.",
  "Pick JPG or WebP, then click Compress.",
  "Check the new sizes and download each image or all of them as a ZIP.",
];

const faqs = [
  {
    q: "Are my images uploaded to a server?",
    a: "No. Compression happens inside your browser, so your photos never leave your device.",
  },
  {
    q: "How does “Target size” work?",
    a: "The tool finds the highest quality that fits under your limit. If lowering the quality alone is not enough, it also reduces the pixel size a little, keeping the shape of the image.",
  },
  {
    q: "Why couldn't it reach my target size?",
    a: "Very small limits (for example under 20 KB for a large, detailed photo) would make the image too small to recognise. The tool then gives you the smallest reasonable version. Try a slightly bigger limit, or crop the photo first.",
  },
  {
    q: "Should I choose JPG or WebP?",
    a: "JPG is accepted everywhere, so it is the safe choice for application forms. WebP makes smaller files and keeps transparent backgrounds, but some older websites don't accept it.",
  },
  {
    q: "What happens to transparent PNG backgrounds?",
    a: "JPG cannot store transparency, so transparent areas become white. Choose WebP to keep them transparent.",
  },
];

export default function CompressImagePage() {
  return (
    <ToolPage
      path="/compress-image"
      title="Compress Image"
      intro="Shrink photos to an exact size such as 50 KB or 100 KB for forms, applications and uploads. Fast, free and private."
      steps={steps}
      faqs={faqs}
    >
      <CompressImageTool />
    </ToolPage>
  );
}
