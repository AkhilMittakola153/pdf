import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import ToolPage from "@/components/ToolPage";
import ResizeImageTool from "@/components/tools/ResizeImageTool";

export const metadata: Metadata = pageMeta({
  title: "Resize Image Online – Change Size in Pixels or Percent",
  description: "Resize JPG, PNG and WebP images by pixels or percentage. Keep the aspect ratio, change format and quality, and download as a ZIP. Free and private: images never leave your device.",
  path: "/resize-image",
});

const steps = [
  "Drop your JPG, PNG or WebP images into the upload box, or click Choose files.",
  "Pick Percentage or Pixels, set the new size, and choose the output format and quality.",
  "Click Resize images, check the before/after preview, then download each image or all of them as a ZIP.",
];

const faqs = [
  {
    q: "Are my images uploaded to a server?",
    a: "No. Resizing happens inside your browser using your device's processor. Your images never leave your device.",
  },
  {
    q: "What does “Keep aspect ratio” do?",
    a: "It stops images from looking stretched. Each image is scaled to fit inside the width and height you enter, keeping its original shape.",
  },
  {
    q: "Which format should I choose?",
    a: "JPG is best for photos and gives small files. PNG keeps transparency and sharp edges, but files are larger. WebP gives small files with good quality and is supported by all modern browsers.",
  },
  {
    q: "Why is my resized image bigger in file size?",
    a: "Saving a photo as PNG, enlarging an image, or using a very high quality setting can increase file size. Try JPG or WebP with quality around 75–85.",
  },
  {
    q: "Is there a size limit?",
    a: "Each image can be up to 30 MB, and you can resize up to 30 images at once. The output can be up to about 16 megapixels so it works on phones too.",
  },
];

export default function ResizeImagePage() {
  return (
    <ToolPage
      path="/resize-image"
      title="Resize Image"
      intro="Change the size of JPG, PNG and WebP images in pixels or percent. Fast, free and private: your images stay on your device."
      steps={steps}
      faqs={faqs}
    >
      <ResizeImageTool />
    </ToolPage>
  );
}
