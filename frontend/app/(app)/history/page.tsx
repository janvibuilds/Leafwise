import { connection } from "next/server";
import type { Metadata } from "next";
import PredictionHistory from "@/components/predictions/PredictionHistory";
import { requireUser } from "@/lib/auth/session";
import { serverApi } from "@/lib/api-server";

export const metadata: Metadata = { title: "History · Leafwise" };
export const instant = false;

export default async function HistoryPage() {
  await connection();
  await requireUser("/history");

  let rows: Awaited<ReturnType<typeof serverApi.listPredictions>> = [];
  let errorMessage: string | null = null;
  try {
    rows = await serverApi.listPredictions({ limit: 20 });
  } catch {
    errorMessage = "Your history could not be loaded. Please try again.";
  }

  return (
    <div>
      <p className="text-[13px] tracking-[0.16em] text-ink/45 uppercase">
        Your workspace
      </p>
      <h1 className="mt-3 font-display text-[clamp(32px,4vw,52px)] leading-[1.1]">
        Prediction history
      </h1>
      <p className="mt-4 max-w-[620px] text-[16px] leading-7 text-ink/70">
        Your most recent 20 scans. Only your own predictions are returned by the
        API.
      </p>
      <div className="mt-9">
        {errorMessage ? (
          <p role="alert" className="rounded-2xl bg-red-50 px-5 py-4 text-[14px] text-red-700">
            {errorMessage}
          </p>
        ) : (
          <PredictionHistory initialRows={rows} />
        )}
      </div>
    </div>
  );
}
