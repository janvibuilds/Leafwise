import Image from "next/image";
import { LuArrowLeft, LuArrowRight, LuArrowUpRight } from "react-icons/lu";
import { cropPotato, cropTomato } from "@/lib/assets";

const stories = [
  {
    eyebrow: "01 / HOME GARDENERS",
    quote: "“What’s happening to my tomatoes?”",
    body: "Spot early fungal-looking marks before they spread. Compare visible symptoms and keep a record of what changes over time.",
    cta: "Start with a garden leaf",
    image: cropTomato,
    alt: "Illustration of a tomato plant",
  },
  {
    eyebrow: "02 / SMALLHOLDER FARMERS",
    quote: "“Which plants need a closer look?”",
    body: "Triage a suspicious leaf before speaking with an extension officer. Bring an image and a clearer question—not a treatment assumption.",
    cta: "Prepare for a field visit",
    image: cropPotato,
    alt: "Illustration of a potato plant",
  },
];

/** "06 · Use cases" (Figma 1:678) — 1728×1150, pad 100/116. */
export default function UseCasesSection() {
  return (
    <section
      id="use-cases"
      className="relative bg-paper xl:min-h-[1150px]"
    >
      <div className="mx-auto w-full max-w-[1728px] px-6 pt-16 pb-16 md:px-10 xl:px-[116px] xl:pt-[100px] xl:pb-0">
        <p className="text-[14px] leading-[21.7px] text-ink">06 / USE CASES</p>

        <div className="mt-6 flex flex-col gap-4 xl:mt-[29px] xl:flex-row xl:items-start xl:justify-between xl:gap-[60px]">
          <h2 className="d64 font-display leading-[1.16] text-ink">
            For everyone who grows.
          </h2>
          <p className="text-[16px] leading-[24.8px] text-ink" aria-hidden="true">
            Real questions. Thoughtful next steps.
            <LuArrowLeft aria-hidden="true" size={16} className="mx-2 inline align-[-3px]" />
            <LuArrowRight aria-hidden="true" size={16} className="inline align-[-3px]" />
          </p>
        </div>

        {/* Story cards — Figma 1:683 */}
        <div className="mt-10 grid grid-cols-1 gap-7 xl:mt-[36px] xl:grid-cols-2">
          {stories.map((story) => (
            <article
              key={story.eyebrow}
              className="relative flex min-h-[395px] flex-col gap-[22px] overflow-hidden rounded-[24px] bg-paper p-6 ring-1 ring-ink/5 xl:p-9"
            >
              <p className="text-[12px] leading-[18.6px] text-ink">
                {story.eyebrow}
              </p>
              <h3 className="d34 font-display leading-[1.16] text-ink">
                {story.quote}
              </h3>
              <p className="max-w-[560px] text-[18px] leading-[1.55] text-ink xl:text-[19px] xl:leading-[29.45px]">
                {story.body}
              </p>
              <a
                href="#quick-scan"
                className="mt-auto inline-flex w-fit items-center gap-1.5 text-[15px] leading-[23.25px] text-ink transition-opacity duration-200 hover:opacity-70"
              >
                <>{story.cta}<LuArrowUpRight aria-hidden="true" size={16} /></>
              </a>
              <Image
                src={story.image}
                alt={story.alt}
                width={191}
                height={65}
                className="pointer-events-none absolute right-4 bottom-4 hidden h-[65px] w-[191px] object-contain opacity-80 sm:block xl:right-6"
              />
            </article>
          ))}
        </div>

        {/* Student card — Figma 1:779 */}
        <div className="mt-7 flex flex-col gap-8 rounded-[24px] bg-paper p-6 ring-1 ring-ink/5 xl:mt-8 xl:flex-row xl:items-start xl:gap-[60px] xl:px-[38px] xl:py-8">
          <div className="flex flex-col gap-3">
            <p className="text-[12px] leading-[18.6px] text-ink">
              03 / AGRICULTURE STUDENTS
            </p>
            <h3 className="d33 font-display leading-[1.16] text-ink">
              Turn observation into learning.
            </h3>
          </div>
          <div className="flex flex-col gap-3 xl:w-[632px]">
            <p className="text-[17px] leading-[1.55] whitespace-pre-line text-ink xl:text-[18px] xl:leading-[27.9px]">
              {"Connect leaf symptoms with class predictions. Compare similar conditions\nand learn why image quality and uncertainty matter."}
            </p>
            <a
              href="#live-preview"
              className="inline-flex w-fit items-center gap-1.5 text-[15px] leading-[23.25px] text-ink transition-opacity duration-200 hover:opacity-70"
            >
              Explore the sample leaves
              <LuArrowUpRight aria-hidden="true" size={16} />
            </a>
          </div>
        </div>

        <p className="mt-8 text-[16px] leading-[24.8px] text-ink xl:mt-[52px]">
          A second pair of eyes—not a replacement for local expertise.
        </p>
      </div>
    </section>
  );
}
