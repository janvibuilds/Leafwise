import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/app/PageHeader";
import PredictionDetailActions from "@/components/predictions/PredictionDetailActions";
import PredictionResult from "@/components/predictions/PredictionResult";
import { serverApi } from "@/lib/api-server";
import { LeafwiseApiError } from "@/lib/api-client";

export const metadata: Metadata = { title: "Prediction detail · Leafwise" };
export const instant = false;

export default async function PredictionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
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
    <>
      <PageHeader title="Result details" />
      <Link href="/history" className="mb-6 inline-flex items-center gap-2 text-[13px] font-semibold text-forest hover:underline">
        ← Back to history
      </Link>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <PredictionResult result={result} />
        <PredictionDetailActions predictionId={result.id} />
      </div>
    </>
  );
}
