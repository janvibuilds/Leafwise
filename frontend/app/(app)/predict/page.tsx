import { connection } from "next/server";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PageHeader from "@/components/app/PageHeader";
import { Icon } from "@/components/app/icons";
import PredictionFlow from "@/components/predictions/PredictionFlow";

export const metadata: Metadata = { title: "Scan Leaf · Leafwise" };
export const instant = false;

const STEPS = [
  {
    title: "Upload a clear photo",
    body: "Capture a single leaf in natural, even light.",
    icon: "upload" as const,
  },
  {
    title: "Explore three matches",
    body: "See possible plant conditions and model confidence.",
    icon: "layers" as const,
  },
  {
    title: "Keep a private history",
    body: "Save observations and compare your plants over time.",
    icon: "history" as const,
  },
];

export default async function PredictPage() {
  await connection();

  return (
    <>
      <PageHeader title="Scan Leaf" />
      <div className="mb-7 max-w-[780px]">
        <h2 className="text-[28px] font-bold leading-tight tracking-[-0.03em] text-forest sm:text-[32px]">
          A little clarity starts here.
        </h2>
        <p className="mt-3 text-[15px] leading-6 text-muted">
          Upload a leaf photo and explore possible matches for the plants you care about.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="app-card p-6 sm:p-7">
          <PredictionFlow />
          <p className="mt-6 text-center text-[13px] text-muted">
            Just exploring? <Link href="/photo-guide" className="font-semibold text-forest hover:underline">See the photo guide</Link>
          </p>
        </section>

        <aside className="app-card overflow-hidden">
          <div className="relative h-[170px] w-full">
            <Image
              src="/images/farm-illustration.webp"
              alt="Illustration of a farm landscape"
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 360px"
              className="object-cover"
            />
          </div>
          <div className="p-6">
            <h2 className="text-[19px] font-bold leading-snug text-forest">
              One leaf. Good light. A clearer picture.
            </h2>
            <p className="mt-3 text-[14px] leading-6 text-muted">
              Keep the leaf in focus and fill the frame. Photograph both healthy and affected areas.
            </p>
            <Link href="/photo-guide" className="mt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-forest hover:underline">
              Open the photo guide <Icon name="arrowRight" size={16} />
            </Link>
          </div>
        </aside>
      </div>

      <h2 className="mt-10 text-[19px] font-bold text-forest">From photo to insight</h2>
      <div className="mt-5 grid gap-5 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <section key={step.title} className="app-card p-6">
            <div className="flex items-start justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-soft text-forest">
                <Icon name={step.icon} size={20} />
              </span>
              <span className="text-[13px] font-semibold text-muted">0{index + 1}</span>
            </div>
            <h3 className="mt-5 text-[17px] font-bold text-forest">{step.title}</h3>
            <p className="mt-2 text-[13px] leading-6 text-muted">{step.body}</p>
          </section>
        ))}
      </div>

      <p className="app-card mt-6 px-6 py-5 text-[13px] leading-6 text-muted">
        <strong className="text-forest">Confidence, not certainty.</strong> AI-assisted estimates are not a
        diagnosis. Confirm important decisions with an agricultural professional.
      </p>
    </>
  );
}
