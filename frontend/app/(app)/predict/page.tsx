import type { Metadata } from "next";
import PredictionFlow from "@/components/predictions/PredictionFlow";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "New scan · Leafwise" };
export const instant = false;

export default async function PredictPage() {
  await requireUser("/predict");
  return (
    <div>
      <p className="text-[13px] tracking-[0.16em] text-ink/45 uppercase">
        New scan
      </p>
      <h1 className="mt-3 font-display text-[clamp(32px,4vw,52px)] leading-[1.1]">
        Scan a leaf
      </h1>
      <p className="mt-4 max-w-[620px] text-[16px] leading-7 text-ink/70">
        Choose one clear leaf photo. The classifier returns its top three
        matches with a confidence state — never a guaranteed diagnosis.
      </p>
      <div className="mt-9 max-w-[760px]">
        <PredictionFlow />
      </div>
    </div>
  );
}
