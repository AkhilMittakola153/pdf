import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import ToolPage from "@/components/ToolPage";
import MergePdfTool from "@/components/tools/MergePdfTool";

export const metadata: Metadata = pageMeta({
  title: "Merge PDF Online – Combine PDF Files into One",
  description: "Combine several PDF files into one document in the order you choose. Free, fast and private: your PDFs are merged in your browser and never uploaded.",
  path: "/merge-pdf",
});

const steps = [
  "Drop two or more PDF files into the upload box, or click Choose files.",
  "Use the arrows to put the files in the order you want.",
  "Optionally change the file name, then click Merge PDFs.",
  "Open the result to check it, then download your merged PDF.",
];

const faqs = [
  {
    q: "Are my PDFs uploaded to a server?",
    a: "No. Merging happens inside your browser, so your documents never leave your device.",
  },
  {
    q: "Will merging reduce quality?",
    a: "No. Pages are copied exactly as they are: text stays sharp and searchable, and images are not recompressed.",
  },
  {
    q: "Can I merge password-protected PDFs?",
    a: "Not yet. Remove the password in your PDF reader first, then merge the unlocked file.",
  },
  {
    q: "How many files can I merge?",
    a: "Up to 30 PDFs of up to 50 MB each. Very large files may take longer on phones.",
  },
  {
    q: "Are links and bookmarks kept?",
    a: "Page content is kept exactly. Some interactive features such as bookmarks and form fields may not carry over into the merged file.",
  },
];

export default function MergePdfPage() {
  return (
    <ToolPage
      path="/merge-pdf"
      title="Merge PDF"
      intro="Combine multiple PDF files into one document in the order you choose. Free and private: everything happens in your browser."
      steps={steps}
      faqs={faqs}
    >
      <MergePdfTool />
    </ToolPage>
  );
}
