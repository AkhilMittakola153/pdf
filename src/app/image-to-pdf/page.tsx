import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import ImageToPdfTool from "@/components/tools/ImageToPdfTool";

export const metadata: Metadata = {
  title: "Image to PDF Converter Online – JPG, PNG, WebP to PDF",
  description:
    "Convert JPG, PNG and WebP images to a single PDF. Reorder pages, choose A4, Letter or fit-to-image, set orientation and margins. Free and private: images never leave your device.",
};

const steps = [
  "Drop your JPG, PNG or WebP images into the upload box, or click Choose files.",
  "Use the arrows to put the images in the order you want the pages.",
  "Choose page size, orientation and margin, and check the live preview.",
  "Click Create PDF, then open or download your file.",
];

const faqs = [
  {
    q: "Are my images uploaded anywhere?",
    a: "No. The PDF is built inside your browser, so your images never leave your device.",
  },
  {
    q: "Will the image quality drop?",
    a: "JPG and PNG images are placed into the PDF unchanged, so there is no quality loss. WebP images and rotated phone photos are converted to high-quality JPG first.",
  },
  {
    q: "What does “Fit to image” mean?",
    a: "Each page is made exactly the size of its image, with no white space other than the margin you choose. Use A4 or Letter if you plan to print.",
  },
  {
    q: "What does “Auto” orientation do?",
    a: "Wide images get landscape pages and tall images get portrait pages, so every image appears as large as possible.",
  },
  {
    q: "How many images can I combine?",
    a: "Up to 50 images of up to 25 MB each in one PDF. Very large batches may be slower on phones.",
  },
];

export default function ImageToPdfPage() {
  return (
    <ToolPage
      title="Image to PDF"
      intro="Combine JPG, PNG and WebP images into one PDF. Reorder pages, pick a page size and download in seconds, all inside your browser."
      steps={steps}
      faqs={faqs}
    >
      <ImageToPdfTool />
    </ToolPage>
  );
}
