import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/app/PageHeader";
import { Icon } from "@/components/app/icons";
import HistoryView from "@/components/history/HistoryView";
import { serverApi } from "@/lib/api-server";

export const metadata: Metadata = { title: "History · Leafwise" };
export const instant = false;

export default async function HistoryPage() {
  await connection();

  let rows: Awaited<ReturnType<typeof serverApi.listPredictions>> = [];
  let errorMessage: string | null = null;
  try {
    rows = await serverApi.listPredictions({ limit: 100 });
  } catch {
    errorMessage = "Your history could not be loaded. Please try again.";
  }

  // Derive a stable reference point from the data itself, so rendering stays pure.
  const now = rows.length
    ? Math.max(...rows.map((row) => Date.parse(row.createdAt)).filter((value) => !Number.isNaN(value)))
    : 0;

  return (
    <>
      <PageHeader title="History" />
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[720px]">
          <p className="text-[13px] font-semibold text-muted">Your growing story.</p>
          <p className="mt-2 text-[16px] leading-6 text-muted">
            Every leaf, every observation, all in one private place.
          </p>
        </div>
        <Link href="/predict" className="app-btn-primary px-5 py-3 text-[14px]">
          <Icon name="plus" size={16} /> Scan a leaf
        </Link>
      </div>
      {errorMessage ? (
        <p role="alert" className="app-card px-5 py-4 text-[14px] text-[#a33b28]">
          {errorMessage}
        </p>
      ) : (
        <HistoryView initialRows={rows} now={now} />
      )}
    </>
  );
}
