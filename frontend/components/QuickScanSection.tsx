import Image from "next/image";
import UploadPill from "./UploadPill";
import { quickScanBg } from "@/lib/assets";

/** "07 · Quick scan" (Figma 1:787) — 1728×1108, barn photo at y=256. */
export default function QuickScanSection() {
  return (
    <section id="quick-scan" className="relative overflow-hidden bg-paper xl:min-h-[1108px]">
      <Image
        src={quickScanBg}
        alt=""
        fill
        sizes="100vw"
        aria-hidden="true"
        className="object-cover object-center"
      />

      <div className="relative mx-auto w-full max-w-[1728px] px-6 py-20 md:px-10 xl:px-[140px] xl:py-0">
        {/* Invitation — Figma 1:789 @140,188 (relative), 650×397, gap 25 */}
        <div className="flex w-full max-w-[650px] flex-col gap-5 xl:mt-[188px]">
          <p className="text-[13px] leading-[19.5px] text-ink">
            YOUR NEXT HEALTHIER HARVEST STARTS HERE
          </p>
          <h2 className="d76 font-display leading-[1.12] text-ink">
            Check your plant’s
            <br />
            health in seconds.
          </h2>
          <p className="text-[18px] leading-[1.5] whitespace-pre-line text-ink xl:text-[21px] xl:leading-[31.5px]">
            {"One clear photo. A more informed next step.\nGive your leaves a little attention today."}
          </p>
          <UploadPill id="quick-scan-upload" className="mt-3 xl:mt-[9px]" />
        </div>
      </div>
    </section>
  );
}
