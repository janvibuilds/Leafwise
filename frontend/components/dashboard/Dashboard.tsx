import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/app/icons";
import { cropAsset } from "@/lib/plant-assets";
import type { PredictionSummary } from "@/lib/types";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function statusFor(row: PredictionSummary): { label: string; color: string } {
  if (row.condition.toLowerCase() === "healthy") return { label: "Healthy", color: "#25c65a" };
  if (row.confidenceState === "high") return { label: "High confidence", color: "#f2c94c" };
  if (row.confidenceState === "review_recommended") return { label: "Needs review", color: "#ef6545" };
  return { label: "Uncertain", color: "#ef6545" };
}

function OverviewCard({ rows }: { rows: PredictionSummary[] }) {
  const healthy = rows.filter((row) => row.condition.toLowerCase() === "healthy").length;
  const percentage = rows.length ? Math.round((healthy / rows.length) * 100) : 0;
  const actions = [
    { href: "/predict", label: "Scan", icon: "focus" as const },
    { href: "/predict", label: "Analyze", icon: "layers" as const },
    { href: "/history", label: "History", icon: "history" as const },
    { href: "/settings", label: "More", icon: "more" as const },
  ];

  return (
    <section className="app-card flex min-h-[300px] flex-col p-7" aria-labelledby="overview-heading">
      <h2 id="overview-heading" className="text-[20px] font-bold tracking-[-0.02em] text-forest">
        Overview
      </h2>
      <div className="mt-9 flex flex-wrap items-end gap-3">
        <p className="text-[40px] font-bold leading-none tracking-[-0.04em] text-forest">
          {rows.length} <span className="text-[24px]">Scans</span>
        </p>
        {rows.length > 0 && (
          <span className="rounded-full bg-[#e6f7ec] px-3 py-1.5 text-[12px] font-bold text-[#168a45]">
            +{percentage}% Healthy
          </span>
        )}
      </div>
      <div className="mt-auto grid grid-cols-4 gap-2 pt-8">
        {actions.map((action) => (
          <Link key={action.label} href={action.href} className="group flex flex-col items-center gap-2 text-center">
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-soft text-forest transition group-hover:bg-line/70">
              <Icon name={action.icon} size={21} />
            </span>
            <span className="text-[13px] font-medium text-inkstrong">{action.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function PhotoGuideBanner() {
  return (
    <section
      className="relative min-h-[300px] overflow-hidden rounded-2xl p-8"
      style={{ background: "var(--color-sky)" }}
      aria-labelledby="guide-heading"
    >
      <div className="relative z-10 max-w-[70%]">
        <h2 id="guide-heading" className="text-[26px] font-bold leading-tight tracking-[-0.025em] text-forest">
          Leaf Photo Guide
        </h2>
        <p className="mt-4 text-[15px] leading-6 text-forest/85">
          Ensure accurate results with clear photos.
        </p>
        <Link
          href="/photo-guide"
          className="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-[14px] font-bold text-forest transition hover:bg-white/90"
        >
          Learn More
        </Link>
      </div>
      <div className="absolute inset-y-0 right-0 w-[46%]">
        <Image
          src="/images/botanical-foliage.webp"
          alt=""
          fill
          sizes="(max-width: 768px) 50vw, 200px"
          className="object-cover object-right opacity-90 mix-blend-multiply"
        />
      </div>
    </section>
  );
}

function RecentScansTable({ rows }: { rows: PredictionSummary[] }) {
  return (
    <section className="app-card p-7" aria-labelledby="recent-heading">
      <h2 id="recent-heading" className="text-[20px] font-bold tracking-[-0.02em] text-forest">
        Recent Leaf Scans
      </h2>
      <div className="app-scroll mt-6 overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse">
          <thead>
            <tr className="border-b border-line">
              <th className="app-table-head">Plant</th>
              <th className="app-table-head">Detection</th>
              <th className="app-table-head">Confidence</th>
              <th className="app-table-head">Date</th>
              <th className="app-table-head">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 5).map((row) => {
              const status = statusFor(row);
              return (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className="py-4 pl-3 pr-2">
                    <Link href={`/predictions/${row.id}`} className="flex items-center gap-3 hover:underline">
                      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-soft">
                        <Image src={cropAsset(row.plant).image} alt="" fill sizes="44px" className="object-cover" />
                      </span>
                      <span className="text-[14px] font-medium text-inkstrong">{row.plant}</span>
                    </Link>
                  </td>
                  <td className="px-3 text-[14px] text-inkstrong">{row.condition}</td>
                  <td className="px-3 text-[14px] text-inkstrong">{(row.confidence * 100).toFixed(1)}%</td>
                  <td className="px-3 text-[14px] text-inkstrong">{formatDate(row.createdAt)}</td>
                  <td className="px-3">
                    <span className="inline-flex items-center gap-2 text-[13px] text-muted">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: status.color }} />
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-[15px] font-semibold text-forest">No scans yet</p>
            <p className="mt-1 text-[13px] text-muted">Your completed predictions will appear here.</p>
            <Link href="/predict" className="app-btn-primary mt-5 px-5 py-2.5 text-[13px]">
              Scan your first leaf
            </Link>
          </div>
        )}
      </div>
      {rows.length > 0 && (
        <div className="mt-5 flex justify-end">
          <Link href="/history" className="text-[13px] font-semibold text-forest hover:underline">
            View all history →
          </Link>
        </div>
      )}
    </section>
  );
}

function FeaturedDetection({ rows }: { rows: PredictionSummary[] }) {
  const featured = rows[0];

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl" style={{ background: "var(--color-forest)" }} aria-label="Featured detection">
      <div className="relative h-[300px] w-full shrink-0 sm:h-[380px] xl:h-[420px]">
        <Image
          src="/images/farm-illustration.webp"
          alt="Illustration of a healthy farm landscape"
          fill
          priority
          sizes="(max-width: 1280px) 100vw, 420px"
          className="object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col p-7 text-white">
        {featured ? (
          <>
            <h2 className="text-[24px] font-bold leading-tight tracking-[-0.025em]">
              {featured.plant} — {featured.condition}
            </h2>
            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[14px] text-white/70">{featured.modelVersion}</p>
              <p className="text-[16px] font-bold text-[#5ce08a]">
                {(featured.confidence * 100).toFixed(1)}% Match
              </p>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-[#25c65a]"
                style={{ width: `${Math.min(100, Math.max(0, featured.confidence * 100))}%` }}
              />
            </div>
            <Link href="/predict" className="app-btn-primary mt-auto w-full py-3.5 text-[15px]">
              Scan New Leaf <Icon name="arrowRight" size={17} />
            </Link>
            <p className="mt-4 text-center text-[12px] text-white/60">AI-assisted estimate only</p>
          </>
        ) : (
          <>
            <h2 className="text-[24px] font-bold leading-tight">Your next discovery starts here</h2>
            <p className="mt-3 text-[14px] leading-6 text-white/70">
              Scan a leaf to see its most likely plant and condition, with a confidence estimate.
            </p>
            <Link href="/predict" className="app-btn-primary mt-auto w-full py-3.5 text-[15px]">
              Scan New Leaf <Icon name="arrowRight" size={17} />
            </Link>
            <p className="mt-4 text-center text-[12px] text-white/60">AI-assisted estimate only</p>
          </>
        )}
      </div>
    </section>
  );
}

export default function Dashboard({ rows, error }: { rows: PredictionSummary[]; error: string | null }) {
  return (
    <>
      {error && (
        <p role="alert" className="mb-6 rounded-xl border border-line bg-white px-5 py-3 text-[14px] text-[#a33b28]">
          {error}
        </p>
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-6">
          <div className="grid gap-5 md:grid-cols-2">
            <OverviewCard rows={rows} />
            <PhotoGuideBanner />
          </div>
          <RecentScansTable rows={rows} />
        </div>
        <FeaturedDetection rows={rows} />
      </div>
    </>
  );
}
