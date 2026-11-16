// Guide articles. Each guide is plain data rendered by app/guides/[slug]/page.tsx.
// To add a guide: copy one object below, change the text, and it appears on
// /guides, in the sitemap, and on the matching tool page automatically.

export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "steps"; items: string[] } // numbered list
  | { type: "list"; items: string[] } // bullet list
  | { type: "tip"; text: string }; // highlighted box

export type Guide = {
  slug: string; // URL: /guides/<slug>
  title: string;
  description: string; // for Google and the guide list
  tool: string; // href of the tool this guide is about
  toolName: string;
  published: string; // e.g. "2026-11-15"
  readMinutes: number;
  body: Block[];
};

export const GUIDES: Guide[] = [
  {
    slug: "reduce-photo-size-for-online-forms",
    title: "How to Reduce Photo Size to Under 50 KB or 100 KB for Online Forms",
    description:
      "Application forms often reject photos over 50 or 100 KB. Here's how to shrink a photo to the exact limit on your phone or computer, without losing clarity.",
    tool: "/compress-image",
    toolName: "Compress Image",
    published: "2026-11-16",
    readMinutes: 3,
    body: [
      {
        type: "p",
        text: "Exam, job and government application forms often accept photos and signature scans only below a size limit such as 20 KB, 50 KB or 100 KB. A normal phone photo is 2–5 MB, which is 20 to 100 times too big. Here's how to bring it down quickly while keeping it clear.",
      },
      { type: "h2", text: "Steps" },
      {
        type: "steps",
        items: [
          "Open the Compress Image tool.",
          "Add your photo (JPG, PNG or WebP). You can add several at once.",
          "Keep Target size selected and tap the limit your form asks for, for example 100 KB. For other limits, type the number in Custom size.",
          "Keep Save as: JPG, which every form accepts.",
          "Tap Compress. Each image shows its new size with a ✓ when it's under the limit.",
          "Download the image and upload it to the form.",
        ],
      },
      {
        type: "tip",
        text: "Crop first, compress second. If the form wants a passport-style photo, crop away the background with your phone's photo editor before compressing. Less area means more detail fits into the same size.",
      },
      { type: "h2", text: "Common questions" },
      {
        type: "list",
        items: [
          "The form also asks for specific dimensions (e.g. 200 × 230 px): use Resize Image first to set the exact pixels, then Compress Image to meet the KB limit.",
          "The photo looks blurry after compressing: the limit is very small for that photo. Crop tighter, or check whether the form allows a slightly larger size.",
          "The form says “JPG/JPEG only”: JPG and JPEG are the same format, so the downloaded .jpg file is fine.",
          "Signature scans: photograph the signature on plain white paper in good light, crop closely, then compress. Signatures usually fit easily under 20 KB.",
        ],
      },
      {
        type: "p",
        text: "Your photos are processed on your own device and never uploaded, which matters for ID photos and signatures.",
      },
    ],
  },
  {
    slug: "compress-pdf-for-email",
    title: "How to Compress a PDF for Email",
    description:
      "PDF too big to attach? Learn why PDFs get large and how to shrink them for email and online forms, without uploading your file anywhere.",
    tool: "/compress-pdf",
    toolName: "Compress PDF",
    published: "2026-11-15",
    readMinutes: 4,
    body: [
      {
        type: "p",
        text: "You try to attach a PDF and your email app refuses: the file is too large. Most email services limit attachments to roughly 20–25 MB (Gmail's limit is 25 MB), and many online application forms are much stricter, often accepting only 1–2 MB. The good news is that most large PDFs can be made several times smaller in under a minute.",
      },
      { type: "h2", text: "Why some PDFs are so large" },
      {
        type: "p",
        text: "Text takes up very little space. A 50-page report made in Word is often under 1 MB. What makes PDFs heavy is images: scanned pages, photos taken with a phone, and high-resolution pictures. A single phone photo can be 3–5 MB, so a document of ten photographed pages easily reaches 30 MB or more.",
      },
      {
        type: "p",
        text: "Compressing a PDF therefore mostly means shrinking the images inside it, using fewer pixels and slightly stronger JPEG compression, while keeping the text untouched.",
      },
      { type: "h2", text: "How to compress a PDF, step by step" },
      {
        type: "steps",
        items: [
          "Open the Compress PDF tool.",
          "Drop your PDF into the upload box, or tap Choose file.",
          "Choose Balanced. It suits almost every document.",
          "Tap Compress PDF. You will see the new size and how much smaller it is.",
          "Tap Open to check the pages still look good, then Download.",
        ],
      },
      { type: "h2", text: "Which compression level should you choose?" },
      {
        type: "list",
        items: [
          "Balanced: noticeably smaller with good quality. Text stays sharp and selectable. Start here.",
          "Strong: smaller still; photos look a little softer. Useful when you need to get under a strict limit.",
          "Maximum: turns every page into an image, like a scan. Gives the smallest files for scanned documents, but you can no longer select or search the text.",
        ],
      },
      {
        type: "tip",
        text: "If the tool says your PDF is “already well optimised”, it probably contains mostly text. Such files are small already. If it is a scanned document, try Maximum.",
      },
      { type: "h2", text: "Still too big?" },
      {
        type: "list",
        items: [
          "Try the next level up (Balanced → Strong → Maximum).",
          "Split the PDF into two or three parts with Split PDF and send them in separate emails.",
          "If you are combining several files, merge them first and compress the merged file once, rather than compressing each file separately.",
        ],
      },
      { type: "h2", text: "Is it safe for private documents?" },
      {
        type: "p",
        text: "Yes. Our tools run inside your web browser, so your PDF is compressed on your own phone or computer and never uploaded to a server. That makes it suitable for bank statements, ID documents and contracts.",
      },
    ],
  },
  {
    slug: "merge-pdf-on-phone",
    title: "How to Merge PDF Files on Your Phone (Android and iPhone)",
    description:
      "Combine several PDFs into one on Android or iPhone, with no app to install. Step-by-step instructions, plus where to find the merged file.",
    tool: "/merge-pdf",
    toolName: "Merge PDF",
    published: "2026-11-15",
    readMinutes: 3,
    body: [
      {
        type: "p",
        text: "Many forms ask for “one PDF”, but your documents are often spread over several files: an ID card, a certificate and a payslip, for example. You don't need to install an app to combine them. Your phone's browser can do it.",
      },
      { type: "h2", text: "Steps (works on Android and iPhone)" },
      {
        type: "steps",
        items: [
          "Open the Merge PDF tool in Chrome, Safari or any modern browser.",
          "Tap Choose files and pick your PDFs. On Android they are usually in Downloads; on iPhone, look in the Files app.",
          "Put the files in the right order with the ↑ and ↓ arrows. The first file becomes the first pages.",
          "Change the file name if you like, then tap Merge PDFs.",
          "Tap Open to check the result, then Download PDF.",
        ],
      },
      { type: "h2", text: "Where does the merged file go?" },
      {
        type: "list",
        items: [
          "Android: usually the Downloads folder. Open the Files app (or “My Files”) and look in Downloads.",
          "iPhone: Safari saves downloads to the Files app, in the Downloads folder (under On My iPhone or iCloud Drive, depending on your settings).",
        ],
      },
      {
        type: "tip",
        text: "Need to add a photo of a document? Turn it into a PDF first with Image to PDF, then use “Continue with this file → Merge PDF” to add the rest. You don't have to download anything in between.",
      },
      { type: "h2", text: "Good to know" },
      {
        type: "list",
        items: [
          "Merging doesn't reduce quality: pages are copied exactly as they are.",
          "If the merged file is too big to upload, run it through Compress PDF afterwards.",
          "Password-protected PDFs need to be unlocked first in your PDF reader.",
          "Your files stay on your phone. Nothing is uploaded.",
        ],
      },
    ],
  },
  {
    slug: "photos-to-pdf",
    title: "How to Turn Photos of Documents into a PDF",
    description:
      "Photographed a document with your phone? Learn how to take clear photos and combine them into one neat PDF, ready to email or upload.",
    tool: "/image-to-pdf",
    toolName: "Image to PDF",
    published: "2026-11-15",
    readMinutes: 4,
    body: [
      {
        type: "p",
        text: "When there's no scanner around, your phone camera works perfectly well. A few simple habits make the difference between a blurry, tilted result and a PDF that looks properly scanned.",
      },
      { type: "h2", text: "1. Take good photos" },
      {
        type: "list",
        items: [
          "Use daylight or a bright room, and avoid the flash, which causes glare on glossy paper.",
          "Place the page on a dark, flat surface so its edges stand out.",
          "Hold the phone directly above the page, parallel to it, so the text isn't slanted.",
          "Fill the screen with the page, but keep all four corners visible.",
          "Tap the screen on the text to focus before taking the photo.",
        ],
      },
      { type: "h2", text: "2. Combine the photos into a PDF" },
      {
        type: "steps",
        items: [
          "Open the Image to PDF tool.",
          "Add all your photos. JPG, PNG and WebP are supported.",
          "Put them in page order with the arrows (or drag them on a computer).",
          "Choose A4 (or Letter in the US), orientation Auto, and a Small margin.",
          "Check the live preview, then tap Create PDF and download it.",
        ],
      },
      {
        type: "tip",
        text: "Photos taken in portrait sometimes appear sideways in other converters. Our tool reads the phone's rotation information, so pages come out upright.",
      },
      { type: "h2", text: "3. Make the file smaller (if needed)" },
      {
        type: "p",
        text: "Phone photos are large, so a PDF of several photographed pages can be 10–30 MB. If a website or email won't accept it, use “Continue with this file → Compress PDF” right after creating it. Balanced usually makes it several times smaller while staying easy to read.",
      },
      { type: "h2", text: "Which page size should I choose?" },
      {
        type: "list",
        items: [
          "A4: the standard in India, Europe and most of the world. Best if the PDF may be printed.",
          "Letter: the standard in the US and Canada.",
          "Fit to image: each page is exactly the size of its photo. Fine for viewing on screen, but pages may have different sizes.",
        ],
      },
    ],
  },
  {
    slug: "extract-pages-from-pdf",
    title: "How to Extract Pages from a PDF (or Split It into Parts)",
    description:
      "Save just the pages you need, split a long PDF into sections, or turn every page into its own file. Free, quick, and without uploading the document.",
    tool: "/split-pdf",
    toolName: "Split PDF",
    published: "2026-11-15",
    readMinutes: 3,
    body: [
      {
        type: "p",
        text: "Sometimes you only need to send one page of a long document, such as a single certificate from a combined file or one chapter of a report. Splitting creates new PDFs from just the pages you choose, while the original stays unchanged.",
      },
      { type: "h2", text: "Three ways to split" },
      {
        type: "list",
        items: [
          "Extract pages: pick pages (for example 2 and 5) and get one new PDF with only those pages.",
          "Split by ranges: type ranges such as 1-3, 4-8, 9 and get one PDF per range. Here that means three files.",
          "Every N pages: cut the document into equal parts. Choose 1 to save every page as a separate PDF.",
        ],
      },
      { type: "h2", text: "Steps" },
      {
        type: "steps",
        items: [
          "Open the Split PDF tool and drop in your PDF.",
          "Choose a mode: Extract pages, Split by ranges or Every N pages.",
          "Tap pages to select them, or type a range.",
          "Check the preview. It lists exactly which files will be created.",
          "Tap the button, then download each file or all of them as a ZIP.",
        ],
      },
      { type: "h2", text: "How to write page ranges" },
      {
        type: "list",
        items: [
          "Use a dash for a range: 3-7 means pages 3, 4, 5, 6 and 7.",
          "Use commas to separate: 1, 4, 9-10.",
          "In “Split by ranges”, each comma-separated part becomes its own file.",
        ],
      },
      {
        type: "tip",
        text: "Want to reorder pages? Split the PDF into parts, then use “Continue with these files → Merge PDF”, arrange the parts in the new order, and merge.",
      },
      {
        type: "p",
        text: "Splitting is lossless: pages are copied exactly, so text stays sharp and selectable. And as with all our tools, your file is processed on your device and never uploaded.",
      },
    ],
  },
];

export const getGuide = (slug: string) => GUIDES.find((g) => g.slug === slug);
export const guidesForTool = (href: string) => GUIDES.filter((g) => g.tool === href);

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
