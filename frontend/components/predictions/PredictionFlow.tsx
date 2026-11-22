"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ImageUpload from "@/components/predictions/ImageUpload";
import PredictionResult from "@/components/predictions/PredictionResult";
import { apiClient } from "@/lib/api-browser";
import { LeafwiseApiError } from "@/lib/api-client";
import { getSiteUrl } from "@/lib/env";
import type { PredictionResponse } from "@/lib/types";

export default function PredictionFlow() {
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function analyze(file: File) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await apiClient.createPrediction(file));
    } catch (cause) {
      if (cause instanceof LeafwiseApiError && cause.status === 401) {
        router.push(`${getSiteUrl()}/login?next=%2Fpredict`);
        return;
      }
      setError(
        cause instanceof Error ? cause.message : "The scan could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <ImageUpload
        busy={busy}
        error={error}
        onSubmit={analyze}
        onClearError={() => setError(null)}
      />

      {result && (
        <div className="space-y-5">
          <PredictionResult result={result} />
          <div className="flex flex-wrap gap-4">
            <Link
              href={`/predictions/${result.id}`}
              className="rounded-full bg-ink px-6 py-3 text-[14px] font-medium text-paper transition hover:bg-night"
            >
              Open result & feedback →
            </Link>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="rounded-full border border-ink/15 px-6 py-3 text-[14px] font-medium text-ink transition hover:bg-bone"
            >
              Scan another leaf
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
