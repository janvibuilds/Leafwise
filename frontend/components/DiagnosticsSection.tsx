import Image from "next/image";
import { LuArrowUpRight, LuCircleCheck } from "react-icons/lu";
import Brand from "@/components/Brand";
import { leafTomato } from "@/lib/assets";

const predictions = [
  { label: "Early blight", value: "96.4%", pct: 96.4 },
  { label: "Septoria leaf spot", value: "2.1%", pct: 2.1 },
  { label: "Healthy", value: "1.5%", pct: 1.5 },
];

const explanationItems = [
  {
    title: "01   Quality comes first",
    body: "Resolution and lighting checks help you start with a usable image.",
  },
  {
    title: "02   See the possibilities",
    body: "Explore the top prediction alongside alternative classes and symptom notes.",
  },
  {
    title: "03   Keep the full picture",
    body: "Confidence estimates come with context, not promises.",
  },
];

/** "01 · AI diagnostics" (Figma 1:59) — 1728×1150, pad 112/100, gap 80. */
export default function DiagnosticsSection() {
  return (
    <section
      id="diagnostics"
      className="relative overflow-hidden bg-paper xl:min-h-[1150px]"
    >
      <div className="mx-auto w-full max-w-[1728px] px-6 pt-16 pb-16 md:px-10 xl:px-[100px] xl:pt-[112px] xl:pb-0">
        {/* Section heading — Figma 1:60 */}
        <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-3 xl:gap-x-[100px]">
          <p className="text-[14px] leading-[21.7px] tracking-[2px] text-ink">
            01 / AI DIAGNOSTICS
          </p>
          <p className="text-[17px] leading-[1.55] text-ink xl:text-[21px] xl:leading-[32.55px]">
            From a leaf photo to a clearer next step.
          </p>
        </div>

        {/* Workspace + explanation — Figma 1:63, gap 80 */}
        <div className="mt-10 flex flex-col gap-10 min-[1100px]:flex-row min-[1100px]:items-start min-[1100px]:gap-[5%] xl:mt-20 min-[1728px]:gap-[80px]">
          {/* Laptop diagnostic workspace — Figma 1:64 */}
          <div className="w-full min-[1100px]:w-[61%] min-[1728px]:w-[920px] min-[1728px]:shrink-0">
            <div className="rounded-[24px] bg-ink p-[15px]">
              <div className="flex w-full flex-col gap-[14px] rounded-[12px] bg-paper p-[15px] xl:gap-[22px] xl:p-[26px]">
                {/* Dashboard navigation — Figma 1:66 */}
                <div className="flex items-start justify-between gap-4">
                  <span className="font-display text-[20px] leading-[27.6px] text-ink xl:text-[24px]">
                    <Brand />
                  </span>
                  <span className="hidden text-[12px] leading-[18.6px] text-ink sm:block">
                    New scan&nbsp;&nbsp;&nbsp;&nbsp;My scans&nbsp;&nbsp;&nbsp;&nbsp;Photo
                    tips
                  </span>
                  <span className="rounded-[10px] bg-bone p-[10px] text-[12px] leading-[18.6px] text-ink">
                    Field workspace
                  </span>
                </div>

                <div className="h-px w-full bg-bone" />

                <h3 className="font-display text-[20px] leading-[27.6px] text-ink xl:text-[24px]">
                  Your leaf, a little better understood.
                </h3>

                {/* Analysis panels — Figma 1:73 */}
                <div className="flex flex-col gap-6 min-[700px]:flex-row">
                  {/* Uploaded leaf — Figma 1:74 */}
                  <div className="flex w-full flex-col gap-[14px] min-[700px]:w-[310px] min-[700px]:shrink-0">
                    <div className="flex aspect-[310/275] items-center justify-center overflow-hidden rounded-[14px] bg-bone">
                      <Image
                        src={leafTomato}
                        alt="Illustrated tomato leaf with blight lesions"
                        width={310}
                        height={275}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <p className="text-[11px] leading-[17.05px] text-ink">
                      tomato_leaf_01.jpg&nbsp;&nbsp;·&nbsp;&nbsp;Sample
                      illustration
                    </p>
                    <p className="w-fit rounded-[10px] bg-bone p-[10px] text-[12px] leading-[18.6px] text-ink">
                      <LuCircleCheck aria-hidden="true" size={13} className="mr-1 inline align-[-2px]" />
                      Resolution &amp; lighting passed
                    </p>
                  </div>

                  {/* Classification result — Figma 1:108 */}
                  <div className="flex min-w-0 flex-1 flex-col gap-[13px]">
                    <p className="text-[11px] leading-[17.05px] text-ink">
                      TOP PREDICTION&nbsp;&nbsp;/&nbsp;&nbsp;EXAMPLE
                    </p>
                    <h4 className="d27 font-display leading-[1.15] text-ink">
                      Tomato — Early blight
                    </h4>
                    <div className="flex items-center gap-[14px]">
                      <span className="d48 font-display leading-[1.15] text-ink">
                        96.4%
                      </span>
                      <span className="text-[12px] leading-[18.6px] text-ink">
                        model confidence
                      </span>
                    </div>

                    {predictions.map((row) => (
                      <div
                        key={row.label}
                        className="flex flex-col gap-[5px]"
                      >
                        <div className="flex justify-between gap-5 text-[12px] leading-[18.6px] text-ink">
                          <span>{row.label}</span>
                          <span>{row.value}</span>
                        </div>
                        <div className="h-[6px] w-full overflow-hidden rounded-[10px] bg-bone">
                          <div
                            className="h-full rounded-[10px] bg-teal"
                            style={{ width: `${row.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}

                    <p className="text-[13px] leading-[20.15px] text-ink">
                      Visible cues: brown target-like spots and yellowing around
                      older leaf tissue.
                    </p>
                    <p className="text-[11px] leading-[17.05px] text-ink">
                      Not a diagnosis. Confirm with a local crop expert.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {/* Laptop aluminum base — Figma 1:147 */}
            <div className="-mt-px hidden h-[18px] w-full rounded-[12px] bg-bone min-[1100px]:-ml-[25px] min-[1100px]:block min-[1100px]:w-[calc(100%+50px)]" />
          </div>

          {/* Diagnostics explanation — Figma 1:134 */}
          <div className="flex w-full flex-col gap-7 min-[1100px]:w-[34%] min-[1728px]:mt-[35.5px] min-[1728px]:w-[525px] min-[1728px]:shrink-0">
            <h2 className="d64 font-display leading-[1.15] text-ink">
              Less guesswork.
              <br />
              More growing.
            </h2>
            <p className="text-[17px] leading-[1.55] text-ink xl:text-[21px] xl:leading-[32.55px]">
              A focused workspace that turns one clear leaf photo into an
              understandable starting point.
            </p>
            {explanationItems.map((item) => (
              <div key={item.title} className="flex flex-col gap-[5px]">
                <p className="text-[18px] leading-[27.9px] text-ink">
                  {item.title}
                </p>
                <p className="text-[16px] leading-[24.8px] text-ink">
                  {item.body}
                </p>
              </div>
            ))}
            <a
              href="#how-it-works"
              className="text-[17px] leading-[26.35px] text-ink transition-opacity duration-200 hover:opacity-70"
            >
              Explore the model
                <LuArrowUpRight aria-hidden="true" size={16} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
