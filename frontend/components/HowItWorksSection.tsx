import Image from "next/image";
import { soilBg } from "@/lib/assets";

const pillars = [
  {
    icon: "✓",
    title: "Image validation\n& preparation",
    body: "Quality checks help catch blurry or poorly lit images before normalizing each leaf for the model.",
    tag: "PILLOW  /  NUMPY",
  },
  {
    icon: "◎",
    title: "EfficientNetB3\ninference",
    body: "The image is classified across 38 healthy and diseased leaf classes through a focused prediction API.",
    tag: "TENSORFLOW  /  FASTAPI",
  },
  {
    icon: "%",
    title: "Transparent\nestimates",
    body: "Read confidence scores, compare alternatives and understand the limits before your next step.",
    tag: "CONTEXT  /  RESPONSIBLE USE",
  },
];

const stack = ["NEXT.JS FRONTEND", "FASTAPI INFERENCE", "SUPABASE AUTH & STORAGE"];

/** "04 · How it works" (Figma 1:581) — 1728×1100, soil image + wash. */
export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden bg-ink xl:min-h-[1100px]"
    >
      <Image
        src={soilBg}
        alt=""
        fill
        sizes="100vw"
        aria-hidden="true"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-[#140904]/25" aria-hidden="true" />

      <div className="relative mx-auto flex w-full max-w-[1728px] flex-col items-center px-6 pt-16 pb-16 text-center md:px-10 xl:px-[140px] xl:pt-[126px] xl:pb-0">
        <p className="text-[14px] leading-[21.7px] text-paper">
          04 / HOW IT WORKS
        </p>
        <h2 className="d64 mt-6 font-display leading-[1.16] text-paper xl:mt-[33px]">
          Good insights start at the roots.
        </h2>
        <p className="mt-4 max-w-[680px] text-[18px] leading-[1.55] text-paper xl:mt-[36px] xl:text-[21px] xl:leading-[32.55px]">
          A considered pipeline. From image quality to a transparent estimate.
        </p>

        {/* Three pillars — Figma 1:587 */}
        <div className="mt-12 grid w-full max-w-[1448px] grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3 xl:mt-[55px] xl:gap-[80px]">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="flex flex-col items-center gap-[22px] text-center"
            >
              <div
                className="flex h-[128px] w-[128px] items-center justify-center rounded-full bg-paper font-display text-[54px] leading-[83.7px] text-ink"
                aria-hidden="true"
              >
                {pillar.icon}
              </div>
              <h3 className="d32 font-display leading-[1.16] whitespace-pre-line text-paper">
                {pillar.title}
              </h3>
              <p className="max-w-[400px] text-[17px] leading-[1.55] text-paper xl:text-[18px] xl:leading-[27.9px]">
                {pillar.body}
              </p>
              <p className="text-[11px] leading-[17.05px] text-paper">
                {pillar.tag}
              </p>
            </div>
          ))}
        </div>

        {/* Architecture stack — Figma 1:606 */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 xl:mt-[45px] xl:gap-[32px]">
          {stack.map((item, index) => (
            <div key={item} className="flex items-center gap-8 xl:gap-[32px]">
              {index > 0 && (
                <span className="text-[18px] leading-[27.9px] text-paper" aria-hidden="true">
                  →
                </span>
              )}
              <span className="text-[12px] leading-[18.6px] text-paper">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
