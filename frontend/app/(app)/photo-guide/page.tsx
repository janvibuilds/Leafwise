import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PageHeader from "@/components/app/PageHeader";
import { Icon } from "@/components/app/icons";

export const metadata: Metadata = { title: "Photo Guide · Leafwise" };
export const instant = false;

const TIPS = [
  {
    icon: "focus" as const,
    title: "Keep it in focus",
    body: "Fill the frame with one leaf. Make sure its surface, edges, and any visible spots are sharp.",
  },
  {
    icon: "sun" as const,
    title: "Find natural light",
    body: "Choose soft, even daylight. Avoid flash, strong shadows, and direct glare on the leaf.",
  },
  {
    icon: "image" as const,
    title: "Keep the scene simple",
    body: "Use a plain background and keep fingers, other leaves, and busy scenery out of the way.",
  },
];

export default function PhotoGuidePage() {
  return (
    <>
      <PageHeader title="Photo Guide" />
      <div className="mb-7 max-w-[780px]">
        <p className="text-[13px] font-semibold text-muted">Leaf photo guide</p>
        <p className="mt-2 text-[16px] leading-6 text-muted">
          Ensure accurate results with clear photos. A few thoughtful details make a difference.
        </p>
      </div>

      <section
        className="grid overflow-hidden rounded-2xl p-8 md:grid-cols-2 md:items-center md:p-10"
        style={{ background: "var(--color-sky)" }}
        aria-labelledby="photo-hero-heading"
      >
        <div>
          <h2 id="photo-hero-heading" className="max-w-[420px] text-[34px] font-bold leading-[1.08] tracking-[-0.035em] text-forest sm:text-[44px]">
            Give your leaf the spotlight.
          </h2>
          <p className="mt-5 max-w-[480px] text-[15px] leading-6 text-forest/85">
            You don&apos;t need a special camera. A clear, well-lit photo helps the model see the details that
            matter.
          </p>
          <Link href="/predict" className="app-btn-primary mt-7 px-6 py-3.5 text-[15px]">
            Scan a leaf <Icon name="arrowRight" size={17} />
          </Link>
        </div>
        <div className="relative mt-8 h-[260px] overflow-hidden rounded-xl md:mt-0 md:h-[320px]">
          <Image
            src="/images/greenhouse-garden-illustration.webp"
            alt="Illustration of seedlings and plants growing in a greenhouse garden"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 560px"
            className="object-cover object-bottom"
          />
        </div>
      </section>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {TIPS.map((tip, index) => (
          <section key={tip.title} className="app-card p-6">
            <div className="flex items-start justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-soft text-forest">
                <Icon name={tip.icon} size={21} />
              </span>
              <span className="text-[13px] font-semibold text-muted">0{index + 1}</span>
            </div>
            <h3 className="mt-6 text-[19px] font-bold text-forest">{tip.title}</h3>
            <p className="mt-2 text-[14px] leading-6 text-muted">{tip.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2" id="support">
        <section className="app-card p-6">
          <h3 className="text-[19px] font-bold text-forest">Before you upload</h3>
          <ul className="mt-4 space-y-3 text-[14px] text-muted">
            {["One leaf, fully visible", "Natural light and a sharp image", "A supported crop from the class library"].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <Icon name="check" size={17} className="mt-0.5 shrink-0 text-[#25c65a]" />
                {item}
              </li>
            ))}
          </ul>
        </section>
        <section className="app-card p-6">
          <h3 className="text-[19px] font-bold text-forest">A few things to avoid</h3>
          <ul className="mt-4 space-y-3 text-[14px] text-muted">
            {[
              "Blurry, very dark, or overexposed photos",
              "Screenshots, collages, or multiple leaves",
              "Treating a possible match as a diagnosis",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <Icon name="minus" size={17} className="mt-0.5 shrink-0 text-muted" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <p className="mt-7 text-[12px] text-muted">
        JPG or PNG · One leaf at a time · Your observations stay in your private history
      </p>
    </>
  );
}
