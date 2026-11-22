"use client";

import Link from "next/link";
import { useState } from "react";
import ImageUpload from "@/components/predictions/ImageUpload";
import PredictionResult from "@/components/predictions/PredictionResult";
import { apiClient } from "@/lib/api-browser";
import { LeafwiseApiError } from "@/lib/api-client";
import type { PredictionResponse } from "@/lib/types";

export default function PredictionFlow() {
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [busy, setBusy] = useState(false);

  async function analyze(file: File) {
    setBusy(true);
    setError(null);
    setAuthRequired(false);
    setResult(null);
    try {
      setResult(await apiClient.createPrediction(file));
    } catch (cause) {
      if (cause instanceof LeafwiseApiError && cause.status === 401) {
        setAuthRequired(true);
        setError("Your session expired. Sign in again to continue.");
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
        onClearError={() => {
          setError(null);
          setAuthRequired(false);
        }}
      />

      {authRequired && (
        <Link
          href="/login?next=%2Fpredict"
          className="app-btn-dark px-6 py-3 text-[14px]"
        >
          Sign in again →
        </Link>
      )}

      {result && (
        <div className="space-y-5">
          <PredictionResult result={result} />
          <div className="flex flex-wrap gap-4">
            <Link
              href={`/predictions/${result.id}`}
              className="app-btn-dark px-6 py-3 text-[14px]"
            >
              Open result & feedback →
            </Link>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="app-btn-quiet px-6 py-3 text-[14px]"
            >
              Scan another leaf
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
