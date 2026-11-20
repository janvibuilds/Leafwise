import Image from "next/image";
import { leafTomato, twilightBg } from "@/lib/assets";

const tabs = ["Healthy leaf", "Early blight", "Powdery mildew"];

const facts = [
  { value: "38", label: "SUPPORTED CLASSES" },
  { value: "300 × 300", label: "RGB MODEL INPUT" },
  { value: "3", label: "SAMPLE LEAVES" },
];

/** "05 · Live preview" (Figma 1:612) — 1728×1150, twilight + wash. */
export default function LivePreviewSection() {
  return (
    <section
      id="live-preview"
      className="relative overflow-hidden bg-night xl:min-h-[1150px]"
    >
      <Image
        src={twilightBg}
        alt=""
        fill
        sizes="100vw"
        aria-hidden="true"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-[#03061a]/35" aria-hidden="true" />

      <div className="relative mx-auto flex w-full max-w-[1728px] flex-col items-center px-6 pt-16 pb-16 text-center md:px-10 xl:px-[180px] xl:pt-[90px] xl:pb-0">
        <p className="text-[14px] leading-[21px] text-paper">05 / LIVE PREVIEW</p>
        <h2 className="d64 mt-6 font-display leading-[1.15] text-paper xl:mt-[30px]">
          Curious? Start with a leaf.
        </h2>
        <p className="mt-4 text-[18px] leading-[1.5] text-paper xl:mt-[28px] xl:text-[20px] xl:leading-[30px]">
          Explore an example before you scan your own.
        </p>

        {/* Sample switcher — Figma 1:618 (static: Figma supplies one state) */}
        <div
          className="mt-8 flex w-fit max-w-full items-center gap-1 rounded-[40px] bg-night p-[6px] xl:mt-[27px]"
          aria-label="Sample leaves: Early blight selected (static preview)"
        >
          {tabs.map((tab) => (
            <span
              key={tab}
              aria-current={tab === "Early blight" ? "true" : undefined}
              className={`min-w-0 rounded-[30px] px-3 py-3 text-[16px] leading-6 whitespace-nowrap sm:px-[25px] ${
                tab === "Early blight"
                  ? "bg-teal text-ink"
                  : "text-paper"
              }`}
            >
              {tab}
            </span>
          ))}
        </div>

        {/* Example diagnosis card — Figma 1:625, 1050×420 */}
        <div className="mt-8 flex w-full max-w-[1050px] flex-col items-center gap-10 rounded-[24px] bg-paper p-5 text-left sm:flex-row xl:mt-[29px] xl:gap-[50px] xl:px-10 xl:py-[30px]">
          <figure className="flex w-full max-w-[322px] shrink-0 flex-col items-center gap-2">
            <div className="flex h-[220px] w-full items-center justify-center overflow-hidden rounded-[14px] bg-bone sm:h-[286px]">
              <Image
                src={leafTomato}
                alt="Illustrated tomato leaf showing early blight symptoms"
                width={322}
                height={286}
                className="h-full w-full object-contain"
              />
            </div>
            <figcaption className="text-[12px] leading-[18px] text-ink">
              Illustrated sample · Tomato
            </figcaption>
          </figure>

          <div className="flex min-w-0 flex-1 flex-col gap-[15px]">
            <p className="text-[11px] leading-[16.5px] text-ink">
              EXAMPLE PREDICTION
            </p>
            <h3 className="d35 font-display leading-[1.15] text-ink">
              Tomato — Early blight
            </h3>
            <div className="flex items-center gap-[15px]">
              <span className="d70 font-display leading-[1.15] text-ink">
                96.4%
              </span>
              <span className="text-[14px] leading-[21px] whitespace-pre-line text-ink">
                {"model\nconfidence"}
              </span>
            </div>
            <p className="text-[17px] leading-[25.5px] whitespace-pre-line text-ink">
              {"Brown concentric spots and yellowing are\ncommon visual cues associated with this class."}
            </p>
            <p className="text-[14px] leading-[21px] text-ink">
              Compare with local guidance before acting.
            </p>
          </div>
        </div>

        {/* Model facts — Figma 1:665 */}
        <div className="mt-10 flex flex-wrap items-start justify-center gap-x-10 gap-y-6 pt-3 xl:mt-12 xl:gap-[110px]">
          {facts.map((fact) => (
            <div key={fact.label} className="flex flex-col items-center">
              <span className="d42 font-display leading-[1.15] text-paper">
                {fact.value}
              </span>
              <span className="mt-2 text-[11px] leading-[16.5px] text-paper">
                {fact.label}
              </span>
            </div>
          ))}
        </div>

        {/* Responsible-use disclaimer — Figma 1:675 */}
        <div className="mt-10 flex w-full max-w-[762px] flex-col items-center gap-[6px] rounded-[18px] bg-night px-5 py-4 text-center xl:mt-[66px] xl:px-7">
          <p className="text-[17px] leading-[25.5px] text-paper">
            A helpful estimate. Not an agricultural diagnosis.
          </p>
          <p className="text-[13px] leading-[19.5px] text-paper">
            Example scores are illustrative. Real-world lighting, look-alike
            symptoms and unsupported plants can affect results.
          </p>
        </div>
      </div>
    </section>
  );
}
