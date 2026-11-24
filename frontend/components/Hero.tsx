import Image from "next/image";
import Nav from "./Nav";
import UploadPill from "./UploadPill";
import { heroBg } from "@/lib/assets";

const trustItems = [
  "38 healthy & disease classes",
  "14 crop types",
  "Confidence, not certainty",
];

/**
 * "Hero & navigation" (Figma 1:32) — 1728×1300.
 * At xl the three blocks sit at their exact Figma coordinates;
 * below xl they flow in the same order with reduced spacing.
 */
export default function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden bg-ink xl:min-h-[1300px]"
    >
      <Image
        src={heroBg}
        alt=""
        fill
        quality={100}
        priority
        sizes="100vw"
        aria-hidden="true"
        className="object-fit "
      />

      <Nav />

      {/* Hero introduction */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1120px] flex-col items-center gap-6 px-6 pt-8 pb-10 text-center xl:absolute xl:top-[174px] xl:left-1/2 xl:w-[1120px] xl:-translate-x-1/2 xl:pt-0 xl:pb-0">
        <p className="rounded-[30px] bg-white/[0.13] px-5 py-[9px] text-[13px] leading-[19.5px] tracking-[1.8px] text-paper">
          EFFICIENTNETB3&nbsp;&nbsp;•&nbsp;&nbsp;38 PLANT &amp; DISEASE CLASSES
        </p>

        <h1 className="d96 font-display leading-[1.1] text-paper">
          Identify plant diseases
          <br />
          in seconds.
        </h1>

        <p className="max-w-[657px] text-[17px] leading-[1.5] text-paper xl:text-[21px] xl:leading-[31.5px]">
          A little clarity. A healthier harvest. Upload a leaf photo and explore
          <br className="hidden xl:block" /> AI-powered insights for the plants
          you care about.
        </p>

        <UploadPill id="hero-upload" />

        <p className="text-[13px] leading-[19.5px] text-paper">
          JPG or PNG&nbsp;&nbsp;·&nbsp;&nbsp;One leaf at a time&nbsp;&nbsp;·&nbsp;&nbsp;No
          account needed to try
        </p>
      </div>

      {/* Hero trust strip — Figma 1:55 @330,1190 743×68 */}
      <div className="relative z-10 mx-auto mt-4 mb-14 flex w-fit max-w-[calc(100%-48px)] flex-wrap items-center gap-x-20 gap-y-3 rounded-[20px] bg-paper px-[34px] py-[22px] xl:absolute xl:top-[1190px] xl:left-[330px] xl:mt-0 xl:mb-0 xl:max-w-none">
        {trustItems.map((item) => (
          <p key={item} className="text-[16px] leading-6 text-ink">
            {item}
          </p>
        ))}
      </div>
    </section>
  );
}
