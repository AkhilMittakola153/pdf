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
    slug: "compress-pdf-to-100kb-200kb",
    title: "How to Compress a PDF to 100 KB, 200 KB or 500 KB (Free)",
    description:
      "Online forms often reject PDFs over 100, 200 or 500 KB. Here's how to get your PDF under the limit on your phone or computer, without uploading it.",
    tool: "/compress-pdf",
    toolName: "Compress PDF",
    published: "2026-11-17",
    readMinutes: 4,
    body: [
      {
        type: "p",
        text: "Exam, job, scholarship and government portals often accept documents only below a size such as 100 KB, 200 KB or 500 KB. Certificates and mark sheets scanned with a phone are usually 1–5 MB, so they get rejected. Most can be brought under the limit in a minute or two.",
      },
      { type: "h2", text: "Method 1: Compress PDF (try this first)" },
      {
        type: "steps",
        items: [
          "Open the Compress PDF tool and add your PDF.",
          "Choose Strong and tap Compress PDF. Check the new size shown on screen.",
          "Still above the limit? Choose Maximum and compress again. This suits scanned documents best.",
          "Tap Open to make sure the text is still readable, then Download and upload it to the form.",
        ],
      },
      {
        type: "tip",
        text: "Maximum turns each page into an image, like a scan. That's fine for certificates and ID proofs, but you can no longer select the text.",
      },
      { type: "h2", text: "Method 2: for very strict limits (1–2 page documents)" },
      {
        type: "p",
        text: "If the limit is tiny, for example 100 KB for a two-page scan, control the size of each page directly:",
      },
      {
        type: "steps",
        items: [
          "Use PDF to Image with JPG and 150 DPI to turn each page into a picture.",
          "Open Compress Image, choose Target size and set it to the form's limit divided by the number of pages (for example 45 KB each for a 2-page, 100 KB limit).",
          "Use Image to PDF to put the compressed pages back into one PDF, in the right order.",
        ],
      },
      { type: "h2", text: "Tips for a smaller, clearer result" },
      {
        type: "list",
        items: [
          "Scan in good light on a plain background. Shadows and grey paper add size.",
          "Upload only the pages the form needs. Use Split PDF to remove extra pages first.",
          "Black-and-white documents compress far better than colour photos of them.",
          "If the text becomes hard to read, the limit is too small for that many pages. Check whether the portal allows separate uploads.",
        ],
      },
      {
        type: "p",
        text: "Everything happens in your browser. Your certificates and ID documents are never uploaded to our servers.",
      },
    ],
  },
  {
    slug: "pdf-to-jpg",
    title: "How to Convert a PDF to JPG on Phone or Computer (Free)",
    description:
      "Turn PDF pages into JPG or PNG images in high quality, one page or all pages at once. Works on Android, iPhone and computers with no app or upload.",
    tool: "/pdf-to-image",
    toolName: "PDF to Image",
    published: "2026-11-17",
    readMinutes: 3,
    body: [
      {
        type: "p",
        text: "Sometimes a form, WhatsApp chat or website accepts only images, but you have a PDF. You can turn each page into a JPG in a few seconds, right in your browser.",
      },
      { type: "h2", text: "Steps" },
      {
        type: "steps",
        items: [
          "Open the PDF to Image tool and add your PDF.",
          "Choose JPG for smaller files, or PNG for the sharpest text.",
          "Choose the resolution: 150 DPI suits most uses; 300 DPI for printing or very small text; 72 DPI for the smallest files.",
          "Convert, then download a single page or all pages together as a ZIP file.",
        ],
      },
      { type: "h2", text: "JPG or PNG?" },
      {
        type: "list",
        items: [
          "JPG: much smaller files. Best for photos, scans and uploading to forms.",
          "PNG: larger files but crisp edges. Best for documents with fine text, tables or diagrams.",
        ],
      },
      {
        type: "tip",
        text: "Need the image under a size limit like 50 KB? Convert to JPG first, then use Compress Image with Target size.",
      },
      { type: "h2", text: "Opening the ZIP on a phone" },
      {
        type: "p",
        text: "On Android, open the Files app, tap the ZIP and choose Extract. On iPhone, tap the ZIP in the Files app and it unpacks into a folder automatically. Your PDF is converted on your own device and never uploaded.",
      },
    ],
  },
  {
    slug: "edit-pdf-free",
    title: "How to Edit a PDF for Free (Fix a Typo, Add Text or a Date)",
    description:
      "Correct a mistake, fill in a blank, add a date or highlight text in any PDF, without Adobe Acrobat. Works in your browser on phone or computer.",
    tool: "/edit-pdf",
    toolName: "Edit PDF",
    published: "2026-11-17",
    readMinutes: 4,
    body: [
      {
        type: "p",
        text: "You notice a wrong date or a spelling mistake in a PDF just before you need to send it, and you don't have the original Word file. You can fix it in a couple of minutes with Edit PDF.",
      },
      { type: "h2", text: "Fix a mistake (cover and retype)" },
      {
        type: "steps",
        items: [
          "Open the Edit PDF tool and add your PDF.",
          "Choose White-out and drag a box over the wrong word or number to cover it.",
          "Choose Text, tap on the white box and type the correct text. Adjust the size so it matches the surrounding text.",
          "Drag to fine-tune the position. Use Undo if something goes wrong.",
          "Tap Save PDF and download the corrected file.",
        ],
      },
      { type: "h2", text: "Other things you can do" },
      {
        type: "list",
        items: [
          "Date: add today's date with one tap.",
          "Highlight: mark important lines for a reviewer.",
          "Draw: tick boxes, circle items or add a quick note.",
          "Image: place a logo, stamp or photo on the page.",
          "Sign: add your signature (see our guide on signing a PDF on your phone).",
        ],
      },
      {
        type: "tip",
        text: "On white paper, white-out is invisible. On coloured or scanned backgrounds the white box may show slightly. Keep it as small as possible.",
      },
      { type: "h2", text: "What this tool can't do" },
      {
        type: "p",
        text: "It doesn't change the existing text inside the PDF directly, the way Word does. It adds new text and shapes on top. For small corrections and filling in forms the result looks the same; for rewriting whole paragraphs, edit the original document instead. Your PDF stays on your device the whole time.",
      },
    ],
  },
  {
    slug: "webp-to-jpg",
    title: "How to Convert WebP to JPG (or PNG) for Free",
    description:
      "Downloaded an image that saved as .webp and won't upload or open? Convert WebP to JPG or PNG in seconds, in bulk, without uploading your images.",
    tool: "/convert-image",
    toolName: "Convert Image",
    published: "2026-11-17",
    readMinutes: 3,
    body: [
      {
        type: "p",
        text: "Many websites now serve images in WebP format. When you save one, you get a .webp file that some apps, older software and online forms refuse to accept. Converting it to JPG or PNG fixes that.",
      },
      { type: "h2", text: "Steps" },
      {
        type: "steps",
        items: [
          "Open the Convert Image tool and add one or more WebP images.",
          "Choose JPG (works everywhere) or PNG (keeps transparent backgrounds).",
          "If you chose JPG and the image has a transparent background, pick White or Black for those areas.",
          "Convert and download the images.",
        ],
      },
      { type: "h2", text: "Which format should I pick?" },
      {
        type: "list",
        items: [
          "JPG: best for photos and for forms that say “JPG/JPEG only”.",
          "PNG: best for logos, screenshots and images with transparent backgrounds.",
          "WebP: the smallest files, good for your own website.",
        ],
      },
      {
        type: "tip",
        text: "The same tool also converts PNG to JPG and JPG to PNG. If the result must be under a size limit, run it through Compress Image afterwards.",
      },
      {
        type: "p",
        text: "Your images are converted inside your browser and never uploaded.",
      },
    ],
  },
  {
    slug: "rotate-pdf-permanently",
    title: "How to Rotate a PDF and Save It Permanently",
    description:
      "Scanned pages sideways or upside down? Rotate one page or all pages of a PDF and save the fix permanently, so it opens the right way everywhere.",
    tool: "/rotate-pdf",
    toolName: "Rotate PDF",
    published: "2026-11-17",
    readMinutes: 2,
    body: [
      {
        type: "p",
        text: "Rotating a PDF in a viewer only changes how you see it on your screen. When you send the file, it still opens sideways for everyone else. To fix it for good, the rotation has to be saved into the PDF.",
      },
      { type: "h2", text: "Steps" },
      {
        type: "steps",
        items: [
          "Open the Rotate PDF tool and add your PDF.",
          "Tap a page to turn it right, or use the arrows under it to turn it left or right.",
          "To fix every page at once, use All left or All right.",
          "Tap Save PDF, then download. The pages now open the right way in every app.",
        ],
      },
      {
        type: "tip",
        text: "Need to rotate some pages and also delete or reorder others? Use Organize PDF to do all of it in one go.",
      },
      {
        type: "p",
        text: "Rotation is lossless: pages keep their original quality and text stays selectable. Your file never leaves your device.",
      },
    ],
  },
  {
    slug: "resize-pdf-to-a4",
    title: "How to Resize a PDF to A4 Size",
    description:
      "Portal asking for an A4 PDF, or pages printing cut off? Change a PDF's page size to A4 (or Letter, A3, A5, Legal) without distorting the content.",
    tool: "/resize-pdf",
    toolName: "Resize PDF",
    published: "2026-11-17",
    readMinutes: 3,
    body: [
      {
        type: "p",
        text: "PDFs made from phone photos or from US software often have odd page sizes. Some portals insist on A4, and printers may cut off the edges. Resize PDF puts every page onto a standard page size and scales the content to fit.",
      },
      { type: "h2", text: "Steps" },
      {
        type: "steps",
        items: [
          "Open the Resize PDF tool and add your PDF.",
          "Choose A4 (the standard in India and most countries). Letter, A3, A5, Legal and Custom are also available.",
          "Leave orientation on Auto so each page keeps its portrait or landscape direction, or force Portrait or Landscape.",
          "Pick a margin: None, Small or Large. Small is a good choice for printing.",
          "Check the preview of page 1, then save and download.",
        ],
      },
      {
        type: "tip",
        text: "Resizing changes the page size, not the file size in KB. To make the file smaller, use Compress PDF afterwards.",
      },
      {
        type: "p",
        text: "Content is scaled evenly, so nothing gets stretched. Your PDF is processed on your device and never uploaded.",
      },
    ],
  },
  {
    slug: "ai-summarizer-on-device",
    title: "Why Can't My Computer Summarise PDFs On-Device? (How to Check)",
    description:
      "The AI Summarizer works on your device only in Chrome on capable computers. See the requirements, check yours in one minute, and learn when to use cloud mode.",
    tool: "/summarize-pdf",
    toolName: "AI Summarizer",
    published: "2026-11-17",
    readMinutes: 4,
    body: [
      {
        type: "p",
        text: "Our AI Summarizer first tries to use the AI model built into your browser, so your document never leaves your computer. That model is large, so Chrome only offers it on computers powerful enough to run it. If yours doesn't qualify, even a one-page PDF can't be summarised on-device. The size of the document makes no difference.",
      },
      { type: "h2", text: "What on-device summaries need" },
      {
        type: "list",
        items: [
          "Browser: Google Chrome 138 or newer. Microsoft Edge's built-in AI is still in preview, so stable Edge usually won't work.",
          "System: Windows 10 or 11, macOS 13 or newer, Linux, or a Chromebook Plus. Phones and tablets (Android and iPhone) are not supported.",
          "Memory: 16 GB RAM with at least 4 CPU cores, or a graphics card with more than 4 GB of video memory. Most 8 GB laptops don't qualify.",
          "Storage: at least 22 GB free on the drive where Chrome is installed (usually C: on Windows).",
          "Network: an unlimited connection such as home Wi-Fi for the one-time model download. A mobile hotspot may be treated as metered and block it.",
          "Work and college laptops: an administrator policy can switch the feature off.",
        ],
      },
      { type: "h2", text: "Check your computer in one minute" },
      {
        type: "steps",
        items: [
          "Check your RAM: on Windows, press Ctrl + Shift + Esc, open the Performance tab and select Memory. On a Mac, open Apple menu → About This Mac.",
          "Update Chrome: open chrome://settings/help in the address bar. Chrome updates itself; click Relaunch if asked.",
          "Open the AI Summarizer page in Chrome, press F12 (or Ctrl + Shift + J) and click the Console tab.",
          "Type await Summarizer.availability() and press Enter.",
          "Match the result with the list below.",
        ],
      },
      { type: "h2", text: "What the result means" },
      {
        type: "list",
        items: [
          "\"available\": the model is ready. Click Summarise on this device.",
          "\"downloadable\" or \"downloading\": your computer qualifies. Click Summarise on this device once while on Wi-Fi and wait for the one-time download to finish.",
          "\"unavailable\": your computer doesn't meet the requirements (usually RAM). Use cloud mode instead.",
          "An error saying Summarizer is not defined: your browser is too old, isn't Chrome, or the feature is blocked by a policy.",
        ],
      },
      {
        type: "tip",
        text: "For more detail, open chrome://on-device-internals in Chrome. It shows whether the AI model is installed and, if not, why (for example, that the device isn't capable).",
      },
      { type: "h2", text: "If your computer doesn't qualify: cloud mode" },
      {
        type: "p",
        text: "Tick the consent box and choose Summarise with cloud AI. Only the extracted text of that one document is sent to Cloudflare Workers AI to create the summary. The PDF file itself is not uploaded, and nothing is stored. Because the text does leave your device, don't use cloud mode for confidential documents such as medical, financial or legal papers.",
      },
      {
        type: "p",
        text: "All our other tools, such as merge, compress, split, edit and sign, work fully on your device on any computer or phone.",
      },
    ],
  },
  {
    slug: "sign-pdf-on-phone",
    title: "How to Sign a PDF on Your Phone (No App Needed)",
    description:
      "Sign a PDF on Android or iPhone in under a minute: draw, type or upload your signature, place it, add the date and download. No app and no upload.",
    tool: "/sign-pdf",
    toolName: "Sign PDF",
    published: "2026-11-17",
    readMinutes: 3,
    body: [
      {
        type: "p",
        text: "Someone emails you a form or agreement and asks you to sign and send it back today. You don't need a printer, a scanner or an app: your phone's browser can do the whole thing.",
      },
      { type: "h2", text: "Steps (Android and iPhone)" },
      {
        type: "steps",
        items: [
          "Save the PDF from the email to your phone (Downloads on Android, the Files app on iPhone).",
          "Open the Sign PDF tool in Chrome or Safari and choose the file.",
          "Create your signature: Draw it with your finger, Type your name in a handwriting style, or Upload a photo of your signature.",
          "Tap the page where the signature should go. Drag it to adjust, and pull the blue corner to resize.",
          "Need the date? Choose Date and tap next to the signature. Use Text for your name or other details.",
          "Tap Save PDF, then Download, and attach the signed file to your reply.",
        ],
      },
      {
        type: "tip",
        text: "Drawing with a finger is easier if you turn your phone sideways: the signature pad gets wider.",
      },
      { type: "h2", text: "Which signature option should I use?" },
      {
        type: "list",
        items: [
          "Draw: looks most like your real signature. Best for most documents.",
          "Type: quick and neat, good for informal forms.",
          "Upload: sign on white paper with a dark pen, photograph it in good light, and crop it closely. Gives the most natural result.",
        ],
      },
      { type: "h2", text: "Is it legally valid?" },
      {
        type: "p",
        text: "This places an image of your signature on the document, which is accepted for many everyday purposes such as rental forms, consent letters and internal approvals. Some documents legally require a certified digital signature (in India, for example, a DSC for certain government and tax filings). If you're unsure, ask the person or organisation requesting it.",
      },
      {
        type: "p",
        text: "Your PDF and your signature stay on your phone the whole time. Nothing is uploaded.",
      },
    ],
  },
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
