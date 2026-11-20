import Image from "next/image";
import { handScanner, leafTomato } from "@/lib/assets";

const photoTips = [
  "01    Capture a single leaf in clear daylight.",
  "02    Keep the leaf sharp and fill the frame.",
  "03    Review your result before taking action.",
];

/**
 * "02 · Field accessibility" (Figma 1:148) — 1728×1100, bg #f5efe4.
 * The illustration group is laid out at exact Figma pixels (650×760)
 * and scaled as a unit by `.scan-wrap` / `.scan-group` in globals.css.
 */
export default function FieldSection() {
  return (
    <section
      id="field"
      className="relative overflow-hidden bg-bone xl:min-h-[1100px]"
    >
      <div className="mx-auto w-full max-w-[1728px] px-6 pt-16 pb-16 md:px-10 xl:px-[150px] xl:pt-[125px] xl:pb-0">
        <p className="text-[14px] leading-[21.7px] text-ink">
          02 / FIELD ACCESSIBILITY
        </p>

        <div className="mt-12 flex flex-col items-start gap-12 xl:mt-[67px] xl:flex-row xl:items-center xl:gap-[100px]">
          {/* Introduction — Figma 1:151 @150,2752 590×590, gap 24 */}
          <div className="flex w-full max-w-[590px] flex-col gap-6">
            <h2 className="d66 font-display leading-[1.16] text-ink">
              Made for the field.
              <br />
              Not just a desk.
            </h2>
            <p className="max-w-[550px] text-[19px] leading-[1.55] text-ink xl:text-[22px] xl:leading-[34.1px]">
              Your next observation could be growing right outside. Take Leafwise
              with you, wherever your plants are.
            </p>

            <div className="flex flex-col gap-[18px]">
              {photoTips.map((tip) => (
                <p
                  key={tip}
                  className="text-[17px] leading-[26.35px] whitespace-pre text-ink"
                >
                  {tip}
                </p>
              ))}
            </div>

            <p className="text-[14px] leading-[21.7px] text-ink">
              Mobile browser ready&nbsp;&nbsp;·&nbsp;&nbsp;No app to install
            </p>

            {/* Saved-scan explanation — Figma 1:159, pad-top 20, gap 6 */}
            <div className="flex flex-col gap-[6px] border-t border-ink/10 pt-5">
              <p className="font-display text-[22px] leading-[25.52px] text-ink">
                One garden. One scan history.
              </p>
              <p className="text-[16px] leading-[24.8px] text-ink">
                Sign in to keep leaf images in Supabase Storage
                <br className="hidden xl:block" /> and revisit your observations
                across devices.
              </p>
            </div>
          </div>

          {/* Hand + phone illustration — Figma 1:162, 650×760 */}
          <div className="scan-wrap shrink-0">
            <div className="scan-group">
              <Image
                src={handScanner}
                alt="A hand holding a phone scanning a tomato plant"
                width={650}
                height={760}
                className="absolute top-0 left-0"
              />

              {/* Mobile scanner mockup — Figma 1:246, @187,72 within group */}
              <div className="absolute top-[72px] left-[187px] flex h-[540px] w-[276px] flex-col gap-[14px] overflow-hidden rounded-[20px] bg-paper px-4 pt-3 shadow-[0_18px_40px_rgba(6,26,43,0.12)]">
                {/* Browser bar */}
                <div className="flex w-[125px] justify-between text-[10px] leading-[13.5px] text-ink">
                  <span>9:41</span>
                  <span>leafwise.app&nbsp;&nbsp;◉</span>
                </div>

                <p className="font-display text-[23px] leading-[31.05px] text-ink">
                  ❧ leafwise
                </p>
                <p className="font-display text-[19px] leading-[25.65px] text-ink">
                  A little closer to clarity.
                </p>
                <p className="text-[12px] leading-[16.2px] whitespace-pre text-ink">
                  {"Capture a single leaf\nin clear daylight."}
                </p>

                {/* Camera framing guide — Figma 1:253, 244×190 */}
                <div className="flex h-[190px] w-[244px] items-center justify-center rounded-[12px] border-2 border-tealbright bg-bone">
                  <Image
                    src={leafTomato}
                    alt="Tomato leaf framed inside the camera guide"
                    width={186}
                    height={165}
                  />
                </div>

                {/* Instant result — Figma 1:283, 244×84 */}
                <div className="flex h-[84px] w-[244px] flex-col justify-center gap-[5px] rounded-[10px] bg-bone px-[10px] py-3">
                  <p className="text-[9px] leading-[12.15px] text-ink">
                    EXAMPLE RESULT
                  </p>
                  <p className="font-display text-[17px] leading-[22.95px] text-ink">
                    Tomato · Early blight
                  </p>
                  <p className="text-[11px] leading-[14.85px] text-ink">
                    96.4% model confidence
                  </p>
                </div>

                <div className="flex h-[36px] w-[244px] items-center justify-center rounded-[30px] bg-teal text-[12px] leading-[16.2px] text-ink">
                  Analyze leaf&nbsp;&nbsp;→
                </div>
                <p className="text-[10px] leading-[13.5px] text-ink">
                  ✓ Saved to your scans
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
