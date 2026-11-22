"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Icon } from "@/components/app/icons";
import { apiClient } from "@/lib/api-browser";
import { cropAsset } from "@/lib/plant-assets";
import type { PredictionSummary } from "@/lib/types";

type Filter = "all" | "healthy" | "review";

const PAGE_SIZE = 8;

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

function status(row: PredictionSummary): { label: string; color: string } {
  if (row.condition.toLowerCase() === "healthy") return { label: "Healthy", color: "#25c65a" };
  return { label: "Needs review", color: "#ef6545" };
}

export default function HistoryView({
  initialRows,
  now,
}: {
  initialRows: PredictionSummary[];
  now: number;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [filter, setFilter] = useState<Filter>("all");
  const [plant, setPlant] = useState("All plants");
  const [dateRange, setDateRange] = useState("Any date");
  const [page, setPage] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const plants = useMemo(
    () => ["All plants", ...Array.from(new Set(rows.map((row) => row.plant))).sort()],
    [rows],
  );

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (filter === "healthy" && row.condition.toLowerCase() !== "healthy") return false;
      if (filter === "review" && row.condition.toLowerCase() === "healthy") return false;
      if (plant !== "All plants" && row.plant !== plant) return false;
      if (dateRange !== "Any date") {
        const days = dateRange === "Last 7 days" ? 7 : 30;
        if (now - new Date(row.createdAt).getTime() > days * 86_400_000) return false;
      }
      return true;
    });
  }, [rows, filter, plant, dateRange, now]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(Math.min(page, pages - 1) * PAGE_SIZE, (Math.min(page, pages - 1) + 1) * PAGE_SIZE);
  const healthy = rows.filter((row) => row.condition.toLowerCase() === "healthy").length;
  const healthyPercent = rows.length ? Math.round((healthy / rows.length) * 100) : 0;
  const cropTypes = new Set(rows.map((row) => row.plant)).size;

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

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="app-card p-6">
          <p className="text-[34px] font-bold leading-none tracking-[-0.04em] text-forest">{rows.length}</p>
          <p className="mt-3 text-[15px] font-semibold text-forest">Saved scans</p>
          <p className="mt-1 text-[12px] text-muted">Your personal observation history</p>
        </div>
        <div className="app-card p-6">
          <p className="text-[34px] font-bold leading-none tracking-[-0.04em] text-forest">{healthyPercent}%</p>
          <p className="mt-3 text-[15px] font-semibold text-forest">Healthy observations</p>
          <p className="mt-1 text-[12px] text-muted">A snapshot of your garden</p>
        </div>
        <div className="app-card p-6">
          <p className="text-[34px] font-bold leading-none tracking-[-0.04em] text-forest">{cropTypes}</p>
          <p className="mt-3 text-[15px] font-semibold text-forest">Crop types scanned</p>
          <p className="mt-1 text-[12px] text-muted">From your own predictions</p>
        </div>
      </div>

      <section className="app-card mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {[
              { value: "all" as const, label: "All scans" },
              { value: "healthy" as const, label: "Healthy" },
              { value: "review" as const, label: "Needs review" },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                className="app-chip"
                data-active={filter === item.value}
                onClick={() => {
                  setFilter(item.value);
                  setPage(0);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="app-chip pr-4" value={plant} onChange={(event) => setPlant(event.target.value)}>
              {plants.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
            <select className="app-chip pr-4" value={dateRange} onChange={(event) => setDateRange(event.target.value)}>
              {["Any date", "Last 7 days", "Last 30 days"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {error}
          </p>
        )}

        <div className="app-scroll mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-line">
                <th className="app-table-head">Plant</th>
                <th className="app-table-head">Detection</th>
                <th className="app-table-head">Confidence</th>
                <th className="app-table-head">Date</th>
                <th className="app-table-head">Status</th>
                <th className="app-table-head"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const state = status(row);
                return (
                  <tr key={row.id} className="border-b border-line last:border-0">
                    <td className="py-4 pl-3 pr-2">
                      <div className="flex items-center gap-3">
                        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-soft">
                          <Image src={cropAsset(row.plant).image} alt="" fill sizes="40px" className="object-cover" />
                        </span>
                        <span>
                          <span className="block text-[14px] font-semibold text-forest">{row.plant}</span>
                          <span className="block text-[12px] text-muted">Leaf photo</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-3 text-[14px] text-inkstrong">{row.condition}</td>
                    <td className="px-3 text-[14px] text-inkstrong">{(row.confidence * 100).toFixed(1)}%</td>
                    <td className="px-3 text-[14px] text-inkstrong">{formatDate(row.createdAt)}</td>
                    <td className="px-3">
                      <span className="inline-flex items-center gap-2 text-[13px] text-muted">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: state.color }} />
                        {state.label}
                      </span>
                    </td>
                    <td className="px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/predictions/${row.id}`}
                          aria-label={`Open ${row.plant} result`}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-soft hover:text-forest"
                        >
                          <Icon name="arrowUpRight" size={17} />
                        </Link>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => remove(row.id)}
                          aria-label={`Delete ${row.plant} scan`}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-red-50 hover:text-cta disabled:opacity-50"
                        >
                          <Icon name="close" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-[16px] font-semibold text-forest">No scans to show</p>
              <p className="mt-2 text-[13px] text-muted">
                {rows.length === 0 ? "Scan a leaf to start your history." : "Try a different filter."}
              </p>
              <Link href="/predict" className="app-btn-primary mt-5 px-5 py-2.5 text-[13px]">
                Scan a leaf
              </Link>
            </div>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted">
            <span>
              Showing {visible.length} of {filtered.length} scans
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="app-btn-quiet px-4 py-2 text-[13px]"
                disabled={page === 0}
                onClick={() => setPage((value) => Math.max(0, value - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="app-btn-quiet px-4 py-2 text-[13px]"
                disabled={page >= pages - 1}
                onClick={() => setPage((value) => Math.min(pages - 1, value + 1))}
              >
                Next <Icon name="arrowRight" size={15} />
              </button>
            </div>
          </div>
        )}
      </section>

      <p className="app-card mt-6 px-6 py-5 text-[13px] leading-6 text-muted">
        <strong className="text-forest">A record of possibilities, not diagnoses.</strong> Confidence describes
        how closely a photo matches the model&apos;s learned classes. Review changes over time and seek expert
        advice when needed.
      </p>
    </>
  );
}
