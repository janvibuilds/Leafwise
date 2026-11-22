import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { LuArrowLeft } from "react-icons/lu";
import { notFound } from "next/navigation";
import PredictionDetailActions from "@/components/predictions/PredictionDetailActions";
import PredictionResult from "@/components/predictions/PredictionResult";
import { serverApi } from "@/lib/api-server";
import { requireUser } from "@/lib/auth/session";
import { LeafwiseApiError } from "@/lib/api-client";

export const metadata: Metadata = { title: "Prediction detail · Leafwise" };
export const instant = false;

export default async function PredictionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  await requireUser("/history");
  const { id } = await params;

  let result: Awaited<ReturnType<typeof serverApi.getPrediction>>;
  try {
    result = await serverApi.getPrediction(id, true);
  } catch (cause) {
    if (cause instanceof LeafwiseApiError && cause.status === 404) {
      notFound();
    }
    throw cause;
  }

  return (
    <div>
      <Link
        href="/history"
        className="inline-flex items-center gap-1.5 text-[14px] text-teal hover:underline"
      >
        <LuArrowLeft aria-hidden="true" size={15} />
        Back to history
      </Link>
      <p className="mt-8 text-[13px] tracking-[0.16em] text-ink/45 uppercase">
        Saved prediction
      </p>
      <h1 className="mt-3 font-display text-[clamp(30px,3.6vw,46px)] leading-[1.1]">
        Result details
      </h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <PredictionResult result={result} />
        <PredictionDetailActions predictionId={result.id} />
      </div>
    </div>
  );
}
