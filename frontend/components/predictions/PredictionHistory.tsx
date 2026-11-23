"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LuArrowRight } from "react-icons/lu";
import { useState } from "react";
import ConfidenceBadge from "@/components/predictions/ConfidenceBadge";
import { apiClient } from "@/lib/api-browser";
import type { PredictionSummary } from "@/lib/types";

function shortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

export default function PredictionHistory({
  initialRows,
}: {
  initialRows: PredictionSummary[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string) {
    if (!window.confirm("Delete this prediction and its stored image?")) return;
    setBusyId(id);
    setError(null);
    try {
      await apiClient.deletePrediction(id);
      setRows((current) => current.filter((row) => row.id !== id));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete the prediction.");
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-ink/20 bg-paper px-6 py-14 text-center">
        <p className="font-display text-[24px] text-ink">No scans yet</p>
        <p className="mt-2 text-[14px] text-ink/60">
          Your completed predictions will appear here.
        </p>
        <Link
          href="/predict"
          className="mt-6 inline-flex rounded-full bg-ink px-6 py-3 text-[14px] font-medium text-paper"
        >
          <>Scan your first leaf <LuArrowRight aria-hidden="true" size={15} /></>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-700">
          {error}
        </p>
      )}
      <ul className="space-y-3">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center gap-4 rounded-2xl border border-ink/10 bg-paper px-5 py-4"
          >
            <div className="min-w-0 flex-1">
              <Link
                href={`/predictions/${row.id}`}
                className="font-display text-[19px] text-ink hover:underline"
              >
                {row.plant} · {row.condition}
              </Link>
              <p className="mt-1 text-[12px] text-ink/50">
                {shortDate(row.createdAt)} · {(row.confidence * 100).toFixed(1)}% ·{" "}
                {row.modelVersion}
              </p>
            </div>
            <ConfidenceBadge state={row.confidenceState} />
            <button
              type="button"
              disabled={busyId === row.id}
              onClick={() => remove(row.id)}
              className="rounded-full border border-ink/15 px-4 py-2 text-[13px] font-medium text-ink transition hover:bg-bone disabled:opacity-60"
            >
              {busyId === row.id ? "Deleting…" : "Delete"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
