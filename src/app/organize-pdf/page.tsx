import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import OrganizePdfTool from "@/components/tools/OrganizePdfTool";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Organize PDF Online – Reorder, Delete and Rotate Pages",
  description:
    "Rearrange PDF pages by dragging, delete pages you don't need and rotate sideways pages, all in one place. Free, lossless and private: your PDF never leaves your device.",
  path: "/organize-pdf",
});

const steps = [
  "Drop a PDF into the upload box, or click Choose file.",
  "Drag pages into the order you want, or use the arrows under each page.",
  "Use the bin icon to remove a page and the rotate icon to turn it.",
  "Click Save PDF, then open or download your new file.",
];

const faqs = [
  {
    q: "Is my PDF uploaded to a server?",
    a: "No. Everything happens inside your browser, so your document never leaves your device.",
  },
  {
    q: "Can I undo a deleted page?",
    a: "Yes. Removed pages stay visible and greyed out until you save; tap the undo icon to bring one back, or Reset to start over.",
  },
  {
    q: "Does reordering reduce quality?",
    a: "No. Pages are copied exactly as they are, so text stays sharp and selectable.",
  },
  {
    q: "How do I reorder pages on a phone?",
    a: "Use the left and right arrows under each page. Dragging works best with a mouse on a computer.",
  },
  {
    q: "Can I add pages from another PDF?",
    a: "Use Merge PDF to combine the files first, then open the merged PDF here to arrange the pages.",
  },
];

export default function OrganizePdfPage() {
  return (
    <ToolPage
      path="/organize-pdf"
      title="Organize PDF"
      intro="Reorder, delete and rotate PDF pages visually, then save a new file. Fast, free and lossless, right in your browser."
      steps={steps}
      faqs={faqs}
    >
      <OrganizePdfTool />
    </ToolPage>
  );
}
