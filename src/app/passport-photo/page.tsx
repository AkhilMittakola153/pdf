import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import PassportPhotoTool from "@/components/tools/PassportPhotoTool";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Passport Size Photo Maker – Free, 3.5 × 4.5 cm & Exam Form Sizes",
  description:
    "Make passport size photos (3.5 × 4.5 cm), US visa and stamp size photos, or exact pixel and KB sizes for exam forms. Print 8 on 4×6 paper. Free, nothing is uploaded.",
  path: "/passport-photo",
});

const steps = [
  "Add a photo taken facing the camera against a plain, light wall.",
  "Choose Passport size, US visa, Stamp size, or Online form for an exact pixel size.",
  "Move and resize the box so your head fills the dotted oval.",
  "Download the single photo, or a print sheet with 8 photos on 4 × 6 in paper or more on A4.",
];

const faqs = [
  {
    q: "What size is a passport size photo in India?",
    a: "The common passport size is 3.5 × 4.5 cm. Some applications ask for a different size, so always check the instructions for the form you're filling in.",
  },
  {
    q: "How do I make a photo of exactly 200 × 230 pixels under 50 KB?",
    a: "Choose Online form, type 200 and 230 as width and height, enter 50 in Max size, position your face and tap Download photo. The photo keeps the exact pixel size and the quality is adjusted to stay under the limit.",
  },
  {
    q: "Is my photo uploaded?",
    a: "No. Your photo is cropped and saved inside your browser and never leaves your phone or computer.",
  },
  {
    q: "Can it make the background white?",
    a: "Not automatically yet. For the best result, stand in front of a plain white or light-coloured wall in good daylight, and use Brightness if the photo looks dark.",
  },
  {
    q: "How do I print the photos at the right size?",
    a: "Download the Sheet PDF or Sheet JPG. Print it at 100% or Actual size (not Fit to page), or send the 4 × 6 in JPG to any photo studio for prints.",
  },
];

export default function PassportPhotoPage() {
  return (
    <ToolPage
      path="/passport-photo"
      title="Passport Photo Maker"
      intro="Make passport size, visa and stamp size photos, or exact pixel and KB sizes for exam and job forms, and print several on one sheet. Free and private."
      steps={steps}
      faqs={faqs}
    >
      <PassportPhotoTool />
    </ToolPage>
  );
}
