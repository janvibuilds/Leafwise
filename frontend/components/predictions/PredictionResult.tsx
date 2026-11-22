import ConfidenceBadge from "@/components/predictions/ConfidenceBadge";
import type { PredictionResponse } from "@/lib/types";

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toISOString().replace("T", " ").slice(0, 19)} UTC`;
}

export default function PredictionResult({ result }: { result: PredictionResponse }) {
  return (
    <article className="app-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold text-muted">Most likely match</p>
          <h2 className="mt-2 text-[28px] font-bold leading-tight tracking-[-0.03em] text-forest">
            {result.plant} · {result.condition}
          </h2>
        </div>
        <ConfidenceBadge state={result.confidenceState} />
      </div>

      {result.imageUrl && (
        <div className="mt-6 overflow-hidden rounded-xl bg-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.imageUrl}
            alt="The uploaded leaf image"
            className="mx-auto max-h-[360px] w-auto object-contain"
          />
        </div>
      )}

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-soft p-5">
          <p className="text-[13px] text-muted">Top-1 confidence</p>
          <p className="mt-2 text-[36px] font-bold leading-none tracking-[-0.04em] text-forest">
            {(result.confidence * 100).toFixed(1)}%
          </p>
          <p className="mt-3 text-[12px] leading-5 text-muted">Raw model probability, not a calibrated guarantee.</p>
        </div>
        <div className="rounded-xl bg-soft p-5">
          <p className="text-[13px] text-muted">Scanned at</p>
          <p className="mt-3 text-[15px] font-medium text-inkstrong">{formatTimestamp(result.createdAt)}</p>
          <p className="mt-3 text-[12px] leading-5 text-muted">Model: {result.modelVersion}</p>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-[15px] font-bold text-forest">Top three matches</h3>
        <ol className="mt-3 space-y-3">
          {result.topPredictions.map((item, index) => (
            <li key={`${item.condition}-${index}`} className="rounded-xl border border-line px-4 py-3">
              <div className="flex items-center gap-4">
                <span className="text-[12px] font-semibold text-muted">0{index + 1}</span>
                <span className="flex-1 text-[14px] font-medium text-inkstrong">{item.condition}</span>
                <span className="text-[14px] font-bold text-forest">{(item.score * 100).toFixed(1)}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-soft">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, item.score * 100)}%`, background: index === 0 ? "var(--color-healthy)" : "var(--color-sky)" }}
                />
              </div>
            </li>
          ))}
        </ol>
      </div>

      {result.confidenceState === "uncertain" && (
        <p className="mt-7 rounded-xl bg-[#fff4e8] px-5 py-4 text-[14px] leading-6 text-[#a35a20]">
          This result is uncertain. Do not treat it as a diagnosis. Try another clear, centered leaf photo or ask
          an agricultural professional.
        </p>
      )}

      <p className="mt-7 text-[12px] leading-5 text-muted">
        AI-assisted estimate for supported classes only. Confirm important treatment or financial decisions with
        a qualified professional.
      </p>
    </article>
  );
}
