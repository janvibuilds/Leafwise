import type { Metadata } from "next";
import Link from "next/link";
import { serverApi } from "@/lib/api-server";
import type { DiseaseInformation } from "@/lib/types";

export const metadata: Metadata = {
  title: "Supported plants · Leafwise",
  description: "All 38 plant and condition classes supported by the Leafwise classifier.",
};

export const instant = false;

function groupByPlant(diseases: DiseaseInformation[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const disease of diseases) {
    const list = groups.get(disease.plant) ?? [];
    list.push(disease.condition);
    groups.set(disease.plant, list);
  }
  return groups;
}

export default async function SupportedPlantsPage() {
  let diseases: DiseaseInformation[] = [];
  let errorMessage: string | null = null;
  try {
    const response = await serverApi.listDiseases();
    diseases = response.diseases;
  } catch {
    errorMessage = "The supported-class list is temporarily unavailable.";
  }

  const groups = groupByPlant(diseases);

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-16 sm:px-10">
      <p className="text-[13px] tracking-[0.16em] text-ink/45 uppercase">
        Model coverage
      </p>
      <h1 className="mt-3 font-display text-[clamp(36px,5vw,64px)] leading-[1.08]">
        Supported plants & conditions
      </h1>
      <p className="mt-5 max-w-[700px] text-[16px] leading-7 text-ink/70">
        The classifier recognizes {diseases.length || 38} Plant Village classes,
        including healthy leaves. This list is served by the same labels file
        used to train the model.
      </p>

      {errorMessage ? (
        <p role="alert" className="mt-10 rounded-2xl bg-red-50 px-5 py-4 text-[14px] text-red-700">
          {errorMessage}
        </p>
      ) : (
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {Array.from(groups.entries()).map(([plant, conditions]) => (
            <section
              key={plant}
              className="rounded-3xl border border-ink/10 bg-bone/50 p-6"
            >
              <h2 className="font-display text-[26px] text-ink">{plant}</h2>
              <p className="mt-1 text-[12px] text-ink/50">
                {conditions.length} {conditions.length === 1 ? "class" : "classes"}
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {conditions.map((condition) => (
                  <li
                    key={condition}
                    className="rounded-full border border-ink/10 bg-paper px-3 py-1.5 text-[13px] text-ink/75"
                  >
                    {condition}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="mt-12 max-w-[720px] text-[13px] leading-6 text-ink/55">
        These classes come from a controlled research dataset. Real field photos
        with varied backgrounds, lighting, and occlusion can reduce accuracy.
        AI-assisted estimates must be confirmed by a qualified professional
        before treatment decisions.
      </p>

      <Link
        href="/login"
        className="mt-8 inline-flex rounded-full bg-ink px-6 py-3 text-[14px] font-medium text-paper"
      >
        Sign in to scan a leaf →
      </Link>
    </main>
  );
}
