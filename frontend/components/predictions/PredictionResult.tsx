/* eslint-disable @next/next/no-img-element */
import ConfidenceBadge from "@/components/predictions/ConfidenceBadge";
import type { PredictionResponse } from "@/lib/types";

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toISOString().replace("T", " ").slice(0, 19)} UTC`;
}

export default function PredictionResult({
  result,
}: {
  result: PredictionResponse;
}) {
  return (
    <article className="rounded-3xl border border-ink/10 bg-paper p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[12px] tracking-[0.16em] text-ink/45 uppercase">
            Most likely match
          </p>
          <h2 className="mt-2 font-display text-[34px] leading-tight text-ink">
            {result.plant} · {result.condition}
          </h2>
        </div>
        <ConfidenceBadge state={result.confidenceState} />
      </div>

      {result.imageUrl && (
        <div className="mt-6 overflow-hidden rounded-2xl bg-bone">
          <img
            src={result.imageUrl}
            alt="The uploaded leaf image"
            className="mx-auto max-h-[360px] w-auto object-contain"
          />
        </div>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl bg-bone/60 p-5">
          <p className="text-[13px] text-ink/55">Top-1 confidence</p>
          <p className="mt-1 font-display text-[38px] leading-none text-ink">
            {(result.confidence * 100).toFixed(1)}%
          </p>
          <p className="mt-3 text-[12px] leading-5 text-ink/50">
            Raw model probability, not a calibrated guarantee.
          </p>
        </div>
        <div className="rounded-2xl bg-bone/60 p-5">
          <p className="text-[13px] text-ink/55">Scanned at</p>
          <p className="mt-2 text-[15px] text-ink">{formatTimestamp(result.createdAt)}</p>
          <p className="mt-3 text-[12px] leading-5 text-ink/50">
            Model: {result.modelVersion}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-[14px] font-medium text-ink">Top three matches</h3>
        <ol className="mt-3 space-y-3">
          {result.topPredictions.map((item, index) => (
            <li
              key={`${item.condition}-${index}`}
              className="flex items-center gap-4 rounded-xl border border-ink/10 px-4 py-3"
            >
              <span className="text-[12px] text-ink/40">{index + 1}</span>
              <span className="flex-1 text-[15px] text-ink">{item.condition}</span>
              <span className="text-[14px] font-medium text-ink">
                {(item.score * 100).toFixed(1)}%
              </span>
            </li>
          ))}
        </ol>
      </div>

      {result.confidenceState === "uncertain" && (
        <p className="mt-7 rounded-2xl bg-red-50 px-5 py-4 text-[14px] leading-6 text-red-800">
          This result is uncertain. Do not treat it as a diagnosis. Try another
          clear, centered leaf photo or ask an agricultural professional.
        </p>
      )}

      <p className="mt-7 text-[12px] leading-5 text-ink/50">
        AI-assisted estimate for supported classes only. Confirm important
        treatment or financial decisions with a qualified professional.
      </p>
    </article>
  );
}
